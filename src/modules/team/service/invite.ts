import { Config, Inject, Provide } from '@midwayjs/core';
import { BaseService, CoolCommException } from '@cool-midway/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import { TeamInviteEntity } from '../entity/invite';
import { TeamMemberEntity } from '../entity/member';
import { TeamMemberService } from './member';
import { TeamInfoEntity } from '../entity/info';
import { TeamInviteJoinEntity } from '../entity/invite_join';
import * as moment from 'moment';
import { v4 as uuidv4 } from 'uuid';
import { join } from 'path';
import { MessageInfoService } from '../../message/service/info';
import { UserInfoEntity } from '../../user/entity/info';
import { UserWxService } from '../../user/service/wx';
import { PluginService } from '../../plugin/service/info';
import { pUploadPath } from '../../../comm/path';
import { BaseSysParamService } from '../../base/service/sys/param';
import { TeamThresholdService } from './threshold';

/** 加入已有团队 */
export const TEAM_INVITE_MODE_TEAM = 0;
/** 个人成团：人满后自动建 team_info，发起人为 ownerId */
export const TEAM_INVITE_MODE_PERSONAL = 1;

/** 系统参数：小程序邀请落地页 path（优先于 config.team.inviteMiniPage） */
export const TEAM_LINK_TO_MINIPAGE_JOIN_URL_KEY = 'TEAM_LINK_TO_MINIPAGE_JOIN_URL';

export type CreateInviteRecordOpts = {
  inviteMode: number;
  /** 团队邀请必填；个人成团创建时为 null */
  teamId: number | null;
  creatorId: number;
  creatorAppUserId?: number | null;
  sponsorUserId?: number | null;
  bindUserId?: number | null;
  days: number;
};

/**
 * 团队邀请服务
 */
@Provide()
export class TeamInviteService extends BaseService {
  @InjectEntityModel(TeamInviteEntity)
  teamInviteEntity: Repository<TeamInviteEntity>;

  @InjectEntityModel(TeamMemberEntity)
  teamMemberEntity: Repository<TeamMemberEntity>;

  @InjectEntityModel(TeamInfoEntity)
  teamInfoEntity: Repository<TeamInfoEntity>;

  @InjectEntityModel(TeamInviteJoinEntity)
  teamInviteJoinEntity: Repository<TeamInviteJoinEntity>;

  @InjectEntityModel(UserInfoEntity)
  userInfoEntity: Repository<UserInfoEntity>;

  @Inject()
  teamMemberService: TeamMemberService;

  @Inject()
  messageInfoService: MessageInfoService;

  @Inject()
  userWxService: UserWxService;

  @Inject()
  pluginService: PluginService;

  @Inject()
  baseSysParamService: BaseSysParamService;

  @Inject()
  teamThresholdService: TeamThresholdService;

  /** 根配置 src/config 的 team 段（default + local/prod 合并；支持环境变量） */
  @Config('team')
  appTeamConfig: {
    inviteMiniPage?: string;
    inviteMiniEnvVersion?: 'release' | 'trial' | 'develop';
    inviteMiniCheckPath?: boolean;
  };

  /**
   * 生成团队邀请（加入已有 team）
   */
  async genInviteCode(teamId: number, creatorId: number, days: number = 7) {
    return this.createInviteRecord({
      inviteMode: TEAM_INVITE_MODE_TEAM,
      teamId,
      creatorId,
      creatorAppUserId: null,
      sponsorUserId: null,
      bindUserId: null,
      days,
    });
  }

  /**
   * 创建邀请记录（团队 / 个人成团）
   */
  async createInviteRecord(opts: CreateInviteRecordOpts) {
    const days = Number(opts.days) > 0 ? Number(opts.days) : 7;
    if (opts.inviteMode === TEAM_INVITE_MODE_TEAM) {
      const tid = opts.teamId;
      if (tid == null) {
        throw new CoolCommException('团队邀请需指定 teamId');
      }
      const team = await this.teamInfoEntity.findOneBy({ id: tid });
      if (!team) {
        throw new CoolCommException('团队已解散或ID错误');
      }
    } else if (opts.inviteMode === TEAM_INVITE_MODE_PERSONAL) {
      if (!opts.sponsorUserId) {
        throw new CoolCommException('个人成团需指定发起人 sponsorUserId');
      }
      const u = await this.userInfoEntity.findOneBy({ id: opts.sponsorUserId });
      if (!u) {
        throw new CoolCommException('发起人用户不存在');
      }
    } else {
      throw new CoolCommException('不支持的 inviteMode');
    }

    const code = uuidv4().replace(/-/g, '').substring(0, 12);
    const expireTime = moment().add(days, 'days').toDate();
    const saved = await this.teamInviteEntity.save({
      teamId: opts.inviteMode === TEAM_INVITE_MODE_TEAM ? opts.teamId! : null,
      inviteMode: opts.inviteMode,
      sponsorUserId:
        opts.inviteMode === TEAM_INVITE_MODE_PERSONAL ? opts.sponsorUserId! : null,
      bindUserId: opts.bindUserId ?? null,
      creatorId: opts.creatorId,
      creatorAppUserId: opts.creatorAppUserId ?? null,
      code,
      expireTime,
      status: 0,
    } as any);

    if (opts.inviteMode === TEAM_INVITE_MODE_PERSONAL && opts.sponsorUserId) {
      await this.teamInviteJoinEntity
        .createQueryBuilder()
        .insert()
        .values({ inviteId: saved.id, userId: opts.sponsorUserId } as any)
        .orIgnore()
        .execute();
    }

    return { id: saved.id, code: saved.code, expireTime: saved.expireTime };
  }

  /** 小程序码 page：系统参数 TEAM_LINK_TO_MINIPAGE_JOIN_URL > config.team.inviteMiniPage */
  private async resolveInviteMiniPage(): Promise<string> {
    const raw = await this.baseSysParamService.dataByKey(TEAM_LINK_TO_MINIPAGE_JOIN_URL_KEY);
    const fromParam =
      raw !== undefined && raw !== null && String(raw).trim() !== '' ? String(raw).trim() : '';
    const fallback = this.appTeamConfig?.inviteMiniPage || 'pages/team/invite';
    return (fromParam || fallback).replace(/^\//, '');
  }

  /**
   * 验证邀请码
   */
  async verifyInviteCode(code: string, userId: number) {
    const invite = await this.teamInviteEntity.findOneBy({ code });
    if (!invite) {
      throw new CoolCommException('邀请链接无效');
    }
    if (invite.status === 1 || moment().isAfter(moment(invite.expireTime))) {
      if (invite.status !== 1) {
        await this.teamInviteEntity.update(invite.id, { status: 1 });
      }
      throw new CoolCommException('邀请链接已过期，请联系管理员重新生成');
    }
    if (invite.bindUserId != null && invite.bindUserId !== userId) {
      throw new CoolCommException('该邀请仅限指定账号使用');
    }
    if (invite.teamId != null) {
      const member = await this.teamMemberEntity.findOneBy({
        teamId: invite.teamId,
        userId,
      });
      if (member && member.exitType === 0) {
        throw new CoolCommException('您已是该团队成员，无需重复加入');
      }
    }
    return invite;
  }

  /**
   * 个人成团：尝试满员建团队（带行锁防并发双建）
   */
  async tryCompletePersonalFormation(inviteId: number): Promise<{
    formed: boolean;
    teamId?: number;
    current?: number;
    need?: number;
  }> {
    const need = await this.teamThresholdService.getPersonalFormationMin();
    let teamIdOut: number | undefined;
    let createdNewTeam = false;

    await this.teamInviteEntity.manager.transaction(async manager => {
      const invite = await manager.findOne(TeamInviteEntity, {
        where: { id: inviteId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!invite || invite.inviteMode !== TEAM_INVITE_MODE_PERSONAL) {
        return;
      }
      if (invite.teamId) {
        teamIdOut = invite.teamId;
        createdNewTeam = false;
        return;
      }
      const cnt = await manager.count(TeamInviteJoinEntity, { where: { inviteId } });
      if (cnt < need) {
        return;
      }
      const sponsorId = invite.sponsorUserId;
      if (!sponsorId) {
        throw new CoolCommException('邀请数据异常：缺少发起人');
      }
      const sponsor = await manager.findOneBy(UserInfoEntity, { id: sponsorId });
      const teamName = `${(sponsor?.nickName || '用户').slice(0, 20)}的队伍`;
      const team = await manager.save(TeamInfoEntity, {
        name: teamName,
        ownerId: sponsorId,
        type: 0,
        memberCount: 0,
        maxMemberCount: 0,
      } as any);
      await manager.update(TeamInviteEntity, invite.id, { teamId: team.id });
      teamIdOut = team.id;
      createdNewTeam = true;
    });

    if (teamIdOut != null && createdNewTeam) {
      const joins = await this.teamInviteJoinEntity.find({
        where: { inviteId },
        order: { id: 'ASC' },
      });
      const seen = new Set<number>();
      for (const j of joins) {
        if (seen.has(j.userId)) continue;
        seen.add(j.userId);
        await this.teamMemberService.join(j.userId, teamIdOut);
      }
      return { formed: true, teamId: teamIdOut };
    }

    if (teamIdOut != null) {
      return { formed: true, teamId: teamIdOut };
    }

    const cnt = await this.teamInviteJoinEntity.count({ where: { inviteId } });
    return { formed: false, current: cnt, need };
  }

  private async sendTeamInviteJoinedMessage(
    invite: TeamInviteEntity,
    userId: number,
    teamId: number
  ) {
    const [team, user] = await Promise.all([
      this.teamInfoEntity.findOneBy({ id: teamId }),
      this.userInfoEntity.findOne({
        where: { id: userId },
        select: ['id', 'nickName', 'phone', 'avatarUrl'] as any,
      }),
    ]);
    await this.messageInfoService.sendSystemToUsers({
      templateKey: 'TEAM_INVITE_JOINED',
      targetType: 3,
      teamId,
      bizType: 'team_invite_joined',
      bizId: teamId,
      templateParams: {
        teamName: team?.name ?? '',
        userId,
        userName: user?.nickName ?? '',
        phone: user?.phone ?? '',
        inviteCode: invite.code,
      },
    });
  }

  /**
   * 通过邀请码加入团队（含个人成团未满员仅写入 join 表）
   */
  async joinByInvite(userId: number, code: string) {
    const invite = await this.verifyInviteCode(code, userId);

    if (invite.inviteMode === TEAM_INVITE_MODE_PERSONAL && !invite.teamId) {
      const fresh = await this.teamInviteEntity.findOneBy({ id: invite.id });
      if (fresh?.teamId) {
        await this.teamMemberService.join(userId, fresh.teamId);
        await this.teamInviteJoinEntity
          .createQueryBuilder()
          .insert()
          .values({ inviteId: invite.id, userId } as any)
          .orIgnore()
          .execute();
        await this.teamInviteEntity.update(invite.id, { joinedUserId: userId } as any);
        await this.sendTeamInviteJoinedMessage(invite, userId, fresh.teamId);
        return {
          teamId: fresh.teamId,
          personalFormation: false,
          formed: true,
        };
      }

      const existingJoin = await this.teamInviteJoinEntity.findOneBy({
        inviteId: invite.id,
        userId,
      });
      if (!existingJoin) {
        await this.teamInviteJoinEntity
          .createQueryBuilder()
          .insert()
          .values({ inviteId: invite.id, userId } as any)
          .orIgnore()
          .execute();
      }

      await this.tryCompletePersonalFormation(invite.id);
      const inv2 = await this.teamInviteEntity.findOneBy({ id: invite.id });

      if (inv2?.teamId) {
        await this.teamInviteEntity.update(invite.id, { joinedUserId: userId } as any);
        await this.sendTeamInviteJoinedMessage(invite, userId, inv2.teamId);
        return {
          teamId: inv2.teamId,
          personalFormation: false,
          formed: true,
        };
      }

      const cnt = await this.teamInviteJoinEntity.count({ where: { inviteId: invite.id } });
      const need = await this.teamThresholdService.getPersonalFormationMin();
      return {
        teamId: null,
        personalFormation: true,
        formed: false,
        formationProgress: { current: cnt, need },
      };
    }

    const tid = invite.teamId;
    if (tid == null) {
      throw new CoolCommException('邀请数据异常');
    }
    await this.teamMemberService.join(userId, tid);
    await this.teamInviteJoinEntity
      .createQueryBuilder()
      .insert()
      .values({ inviteId: invite.id, userId } as any)
      .orIgnore()
      .execute();
    await this.teamInviteEntity.update(invite.id, { joinedUserId: userId } as any);
    await this.sendTeamInviteJoinedMessage(invite, userId, tid);

    return {
      teamId: tid,
      personalFormation: false,
      formed: true,
    };
  }

  /**
   * 生成团队邀请「无限小程序码」并上传，返回可访问的图片 URL；失败返回 null（不阻断创建邀请）
   * scene 使用邀请码（≤32 字符）
   */
  /** 创建邀请后尝试生成小程序码并回写 miniProgramQrUrl */
  async finishCreateInviteWithOptionalQr(result: {
    id: number;
    code: string;
    expireTime: Date;
  }): Promise<{ id: number; code: string; expireTime: Date; miniProgramQrUrl: string | null }> {
    let miniProgramQrUrl: string | null = null;
    try {
      miniProgramQrUrl = await this.genMiniProgramInviteQrUrl(result.code);
      if (miniProgramQrUrl) {
        await this.teamInviteEntity.update(result.id, { miniProgramQrUrl } as any);
      }
    } catch {
      miniProgramQrUrl = null;
    }
    return { ...result, miniProgramQrUrl };
  }

  /** App：仅团队负责人可为该团队创建「加入已有团队」邀请 */
  async createTeamInviteForApp(
    ownerUserId: number,
    teamId: number,
    days: number,
    bindUserId?: number | null
  ) {
    const team = await this.teamInfoEntity.findOneBy({ id: teamId, ownerId: ownerUserId });
    if (!team) {
      throw new CoolCommException('仅团队负责人可创建该团队的邀请链接');
    }
    return this.createInviteRecord({
      inviteMode: TEAM_INVITE_MODE_TEAM,
      teamId,
      creatorId: 0,
      creatorAppUserId: ownerUserId,
      sponsorUserId: null,
      bindUserId: bindUserId ?? null,
      days,
    });
  }

  /** App：任意登录用户可创建「个人成团」邀请（发起人为本人） */
  async createPersonalInviteForApp(userId: number, days: number, bindUserId?: number | null) {
    return this.createInviteRecord({
      inviteMode: TEAM_INVITE_MODE_PERSONAL,
      teamId: null,
      creatorId: 0,
      creatorAppUserId: userId,
      sponsorUserId: userId,
      bindUserId: bindUserId ?? null,
      days,
    });
  }

  async genMiniProgramInviteQrUrl(code: string): Promise<string | null> {
    if (!code || code.length > 32) {
      return null;
    }
    const page = await this.resolveInviteMiniPage();
    const buffer = await this.userWxService.getUnlimitedMiniProgramQrCodeBuffer({
      scene: code,
      page,
      envVersion: this.appTeamConfig?.inviteMiniEnvVersion ?? 'release',
      checkPath: Boolean(this.appTeamConfig?.inviteMiniCheckPath),
    });
    const fs = await import('fs/promises');
    const dir = join(pUploadPath(), 'team');
    await fs.mkdir(dir, { recursive: true });
    const fileName = `invite-${code}.png`;
    const filePath = join(dir, fileName);
    await fs.writeFile(filePath, buffer);
    const key = join('team', fileName).replace(/\\/g, '/');
    const url = await this.pluginService.invoke('upload', 'uploadWithKey', filePath, key);
    return String(url || '').replace(/\\/g, '/');
  }
}
