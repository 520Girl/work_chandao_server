
import { Init, Inject, Provide } from '@midwayjs/core';
import { BaseService, CoolCommException, CoolEventManager } from '@cool-midway/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import { UserInfoEntity } from '../entity/info';
import { UserSmsService } from './sms';
import { UserWxService } from './wx';
import * as md5 from 'md5';
import { UserRole } from '../../../comm/const';
import { TeamInfoEntity } from '../../team/entity/info';
import { TeamMemberEntity } from '../../team/entity/member';
import { TeamInviteEntity } from '../../team/entity/invite';
import { PostInfoEntity } from '../../post/entity/info';
import { UserWxEntity } from '../entity/wx';

/**
 * 用户信息服务
 */
@Provide()
export class UserInfoService extends BaseService {
  @InjectEntityModel(UserInfoEntity)
  userInfoEntity: Repository<UserInfoEntity>;

  @InjectEntityModel(TeamInfoEntity)
  teamInfoEntity: Repository<TeamInfoEntity>;

  @InjectEntityModel(TeamMemberEntity)
  teamMemberEntity: Repository<TeamMemberEntity>;

  @InjectEntityModel(UserWxEntity)
  userWxEntity: Repository<UserWxEntity>;

  @Inject()
  userSmsService: UserSmsService;

  @Inject()
  userWxService: UserWxService;

  @Inject()
  coolEventManager: CoolEventManager;

  @Init()
  async init() {
    await super.init();
    this.setEntity(this.userInfoEntity);
  }

  /**
   * 分页查询，补充 loginType（从 user_wx.type 获取，取最新一条）
   */
  async page(query?: any, option?: any) {
    const res: any = await super.page(query, option);
    if (res?.data?.list?.length) {
      const unionids = [...new Set(res.data.list.map((r: any) => r.unionid).filter(Boolean))];
      if (unionids.length) {
        const wxAll = await this.userWxEntity
          .createQueryBuilder('w')
          .select(['w.unionid', 'w.type'])
          .where('w.unionid IN (:...unionids)', { unionids })
          .orderBy('w.createTime', 'DESC')
          .getMany();
        const wxByUnionid: Record<string, number> = {};
        for (const w of wxAll) {
          if (w.unionid && wxByUnionid[w.unionid] === undefined) {
            wxByUnionid[w.unionid] = w.type;
          }
        }
        for (const row of res.data.list) {
          row.loginType = row.unionid ? wxByUnionid[row.unionid] ?? null : null;
        }
      }
    }
    return res;
  }

  /**
   * 更新用户信息 (Admin)
   * @param param
   */
  async update(param: any) {
    const { id, role, firstTeamId } = param;
    const user = await this.userInfoEntity.findOneBy({ id });
    if (!user) throw new CoolCommException('用户不存在');

    // 禁止前端传参
    delete param.isManualRole;
    delete param.unionid; // 登录唯一ID由登录时生成，不可手动修改

    // 如果角色变更，自动标记为人工指定
    if (role !== undefined && role !== user.role) {
      param.isManualRole = 1;
    }

    // 2. 首个团队安全绑定
    if (firstTeamId && firstTeamId !== user.firstTeamId) {
      const team = await this.teamInfoEntity.findOneBy({ id: firstTeamId });
      if (!team) {
        throw new CoolCommException('团队已解散或ID错误');
      }

      // 自动加入团队
      const isMember = await this.teamMemberEntity.findOneBy({
        userId: id,
        teamId: firstTeamId,
      });

      if (!isMember) {
        await this.teamMemberEntity.save({
          userId: id,
          teamId: firstTeamId,
          joinedAt: new Date(),
          exitType: 0, // 在职
        });
      } else {
        // 如果之前退出过，重新加入
        if (isMember.exitType !== 0) {
            await this.teamMemberEntity.update(isMember.id, {
                exitType: 0,
                joinedAt: new Date(),
                leftAt: null,
                operatorId: null
            });
        }
      }
    }

    await super.update(param);
  }

  /**
   * 根据团队人数自动升级角色
   * @param userId
   * @param memberCount
   */
  async autoUpgradeRole(userId: number, memberCount: number) {
    const user = await this.userInfoEntity.findOneBy({ id: userId });
    if (!user || user.isManualRole === 1) return;

    let newRole = user.role;
    if (memberCount >= 101) {
      newRole = UserRole.TEAM_ADMIN; // 团长
    } else if (memberCount >= 11) {
      newRole = UserRole.CAMP_ADMIN; // 营长
    } else if (memberCount >= 3) {
      newRole = UserRole.GROUP_LEADER; // 组长
    }

    if (newRole !== user.role) {
      await this.userInfoEntity.update(userId, { role: newRole });
      
      // 触发角色升级事件
      this.coolEventManager.emit('userRoleUpgraded', userId, newRole);
    }
  }

  /**
   * 用户详情统计（Admin 用户管理用）
   * @param userId
   */
  async userDetailStats(userId: number) {
    const postRepo = this.teamMemberEntity.manager.getRepository(PostInfoEntity);
    const inviteRepo =
      this.teamMemberEntity.manager.getRepository(TeamInviteEntity);
    const user = await this.userInfoEntity.findOneBy({ id: userId });
    let inviter: any = null;
    if (user?.invitedBy) {
      inviter = await this.userInfoEntity.findOne({
        where: { id: user.invitedBy },
        select: ['id', 'nickName', 'phone', 'avatarUrl'],
      });
    }
    // inviteCreatedCount: 该用户作为负责人的团队所创建的邀请数
    const inviteCreatedCount = await inviteRepo
      .createQueryBuilder('i')
      .innerJoin(TeamInfoEntity, 't', 'i.teamId = t.id')
      .where('t.ownerId = :userId', { userId })
      .getCount();
    const [teamCount, postCount, inviteJoinedCount] = await Promise.all([
      this.teamMemberEntity.count({ where: { userId, exitType: 0 } }),
      postRepo.count({ where: { userId } }),
      inviteRepo.count({ where: { joinedUserId: userId } }),
    ]);
    return {
      teamCount,
      postCount,
      inviteCreatedCount,
      inviteJoinedCount,
      inviter: inviter ? { id: inviter.id, nickName: inviter.nickName, phone: inviter.phone, avatarUrl: inviter.avatarUrl } : null,
    };
  }

  /**
   * 获取用户信息
   * @param userId
   */
  async person(userId: number) {
    const user = await this.userInfoEntity.findOneBy({ id: userId });
    if (!user) {
      throw new CoolCommException('用户不存在');
    }
    delete user.password;

    // 获取所属团队名称
    let teamName = null;
    if (user.firstTeamId) {
      const team = await this.teamInfoEntity.findOneBy({
        id: user.firstTeamId,
      });
      if (team) {
        teamName = team.name;
      }
    }

    return {
      ...user,
      teamName,
    };
  }

  /**
   * 更新用户信息
   * @param userId
   * @param body
   */
  async updatePerson(userId: number, body: Record<string, any>) {
    const updateData: Partial<UserInfoEntity> = {};
    if (body.avatarUrl !== undefined) updateData.avatarUrl = body.avatarUrl;
    if (body.nickName !== undefined) updateData.nickName = body.nickName;
    if (body.gender !== undefined) updateData.gender = body.gender;
    if (Object.keys(updateData).length > 0) {
      await this.userInfoEntity.update(userId, updateData);
    }
    return this.person(userId);
  }

  /**
   * 更新用户密码
   * @param userId
   * @param password
   * @param code
   */
  async updatePassword(userId: number, password: string, code: string) {
    const user = await this.userInfoEntity.findOneBy({ id: userId });
    if (!user) {
      throw new CoolCommException('用户不存在');
    }
    if (!user.phone) {
      throw new CoolCommException('未绑定手机号');
    }
    const check = await this.userSmsService.checkCode(user.phone, code);
    if (!check) {
      throw new CoolCommException('验证码错误');
    }
    await this.userInfoEntity.update(userId, { password: md5(password) });
  }

  /**
   * 注销账号
   * @param userId
   */
  async logoff(userId: number) {
    await this.userInfoEntity.update(userId, { status: 2 });
  }

  /**
   * 绑定手机号
   * @param userId
   * @param phone
   * @param code
   */
  async bindPhone(userId: number, phone: string, code: string) {
    const check = await this.userSmsService.checkCode(phone, code);
    if (!check) {
      throw new CoolCommException('验证码错误');
    }
    const exists = await this.userInfoEntity.findOneBy({ phone });
    if (exists && exists.id !== userId) {
      throw new CoolCommException('手机号已被绑定');
    }
    await this.userInfoEntity.update(userId, { phone });
  }

  /**
   * 绑定小程序手机号
   * @param userId
   * @param code
   * @param encryptedData
   * @param iv
   */
  async miniPhone(
    userId: number,
    code: string,
    encryptedData: string,
    iv: string
  ) {
    const phone = await this.userWxService.miniPhone(code, encryptedData, iv);
    if (!phone) {
      throw new CoolCommException('获得手机号失败，请检查配置');
    }
    const exists = await this.userInfoEntity.findOneBy({ phone });
    if (exists && exists.id !== userId) {
      throw new CoolCommException('手机号已被绑定');
    }
    await this.userInfoEntity.update(userId, { phone });
    return this.person(userId);
  }
}
