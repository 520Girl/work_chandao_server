
import { Init, Inject, Provide } from '@midwayjs/core';
import {
  BaseService,
  CoolCommException,
  CoolEventManager,
} from '@cool-midway/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import { TeamInfoEntity } from '../entity/info';
import { TeamMemberEntity } from '../entity/member';
import { UserInfoEntity } from '../../user/entity/info';

/**
 * 团队信息服务
 */
@Provide()
export class TeamInfoService extends BaseService {
  @InjectEntityModel(TeamInfoEntity)
  teamInfoEntity: Repository<TeamInfoEntity>;

  @InjectEntityModel(TeamMemberEntity)
  teamMemberEntity: Repository<TeamMemberEntity>;

  @InjectEntityModel(UserInfoEntity)
  userInfoEntity: Repository<UserInfoEntity>;

  @Inject()
  coolEventManager: CoolEventManager;

  @Init()
  async init() {
    await super.init();
    this.setEntity(this.teamInfoEntity);
  }

  /**
   * 更新团队信息，禁止修改 memberCount、type（由成员变动自动联动）
   */
  async update(param: any) {
    delete param.memberCount;
    delete param.type;
    return super.update(param);
  }

  /**
   * 根据成员数同步类型并触发角色升级事件（供成员变动后调用）
   */
  async syncTypeAndEmit(teamId: number) {
    const team = await this.teamInfoEntity.findOneBy({ id: teamId });
    if (team) {
      const newType = this.calcTypeByMemberCount(team.memberCount);
      if (team.type !== newType) {
        await this.teamInfoEntity.update(teamId, { type: newType });
      }
      this.coolEventManager.emit('teamMemberCountChanged', team.ownerId, team.memberCount);
    }
  }

  /**
   * 根据成员数计算团队类型：小组(3,10]、营级[10,100)、团级[100,+∞)
   */
  private calcTypeByMemberCount(count: number): number {
    if (count >= 100) return 3; // 团级
    if (count >= 10) return 2; // 营级
    if (count > 3) return 1; // 小组
    return 0; // 未知
  }

  /**
   * 更新团队成员数量、自动联动类型，并触发角色升级
   */
  async updateMemberCount(teamId: number, count: number) {
    const team = await this.teamInfoEntity.findOneBy({ id: teamId });
    if (team) {
      const newCount = Math.max(0, team.memberCount + count);
      const newType = this.calcTypeByMemberCount(newCount);
      await this.teamInfoEntity.update(teamId, {
        memberCount: newCount,
        type: newType,
      });
      // 触发自动升级逻辑
      this.coolEventManager.emit(
        'teamMemberCountChanged',
        team.ownerId,
        newCount
      );
    }
  }

  /**
   * 加入团队
   * @param userId 用户ID
   * @param teamId 团队ID
   * @param invitedBy 邀请人ID (可选)
   */
  async joinTeam(userId: number, teamId: number, invitedBy?: number) {
    const team = await this.teamInfoEntity.findOneBy({ id: teamId });
    if (!team) {
      throw new CoolCommException('团队不存在');
    }

    // 检查是否已加入
    const exists = await this.teamMemberEntity.findOneBy({ userId, teamId });
    if (exists) {
      return exists;
    }

    // 加入团队
    const member = await this.teamMemberEntity.save({
      userId,
      teamId,
      joinedAt: new Date(),
    });

    // 更新团队人数
    await this.updateMemberCount(teamId, 1);

    // 更新用户信息
    const userUpdate: Partial<UserInfoEntity> = {};
    const user = await this.userInfoEntity.findOneBy({ id: userId });

    if (user) {
      // 如果没有归属团队，则设置为首个团队
      if (!user.firstTeamId) {
        userUpdate.firstTeamId = teamId;
      }
      // 如果有邀请人且当前没有邀请人，则记录邀请人
      if (invitedBy && !user.invitedBy && invitedBy !== userId) {
        userUpdate.invitedBy = invitedBy;
      }

      if (Object.keys(userUpdate).length > 0) {
        await this.userInfoEntity.update(userId, userUpdate);
      }
    }

    return member;
  }

  /**
   * 获取团队拥有者ID (用于返佣归属)
   * @param teamId
   */
  async getTeamOwner(teamId: number) {
    const team = await this.teamInfoEntity.findOneBy({ id: teamId });
    return team ? team.ownerId : null;
  }
}
