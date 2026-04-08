import { Inject, Provide } from '@midwayjs/core';
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
import { MessageInfoService } from '../../message/service/info';
import { UserInfoEntity } from '../../user/entity/info';

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

  /**
   * 生成邀请码
   * @param teamId 团队ID
   * @param creatorId 创建人ID
   * @param days 有效期（天）
   */
  async genInviteCode(teamId: number, creatorId: number, days: number = 7) {
    const team = await this.teamInfoEntity.findOneBy({ id: teamId });
    if (!team) {
      throw new CoolCommException('团队已解散或ID错误');
    }
    const code = uuidv4().replace(/-/g, '').substring(0, 12);
    const expireTime = moment().add(days, 'days').toDate();
    await this.teamInviteEntity.save({
      teamId,
      code,
      expireTime,
      creatorId,
      status: 0,
    });
    return { code, expireTime };
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
    const member = await this.teamMemberEntity.findOneBy({
      teamId: invite.teamId,
      userId,
    });
    if (member && member.exitType === 0) {
      throw new CoolCommException('您已是该团队成员，无需重复加入');
    }
    return invite;
  }

  /**
   * 通过邀请码加入团队
   */
  async joinByInvite(userId: number, code: string) {
    const invite = await this.verifyInviteCode(code, userId);
    await this.teamMemberService.join(userId, invite.teamId);
    await this.teamInviteJoinEntity
      .createQueryBuilder()
      .insert()
      .values({ inviteId: invite.id, userId } as any)
      .orIgnore()
      .execute();
    await this.teamInviteEntity.update(invite.id, { joinedUserId: userId });

    const [team, user] = await Promise.all([
      this.teamInfoEntity.findOneBy({ id: invite.teamId }),
      this.userInfoEntity.findOne({
        where: { id: userId },
        select: ['id', 'nickName', 'phone', 'avatarUrl'] as any,
      }),
    ]);

    await this.messageInfoService.sendSystemToUsers({
      templateKey: 'TEAM_INVITE_JOINED',
      targetType: 3,
      teamId: invite.teamId,
      bizType: 'team_invite_joined',
      bizId: invite.teamId,
      templateParams: {
        teamName: team?.name ?? '',
        userId,
        userName: user?.nickName ?? '',
        phone: user?.phone ?? '',
        inviteCode: invite.code,
      },
    });

    return { teamId: invite.teamId };
  }
}
