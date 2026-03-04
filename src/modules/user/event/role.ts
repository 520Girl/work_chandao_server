
import { Inject, Provide, Scope, ScopeEnum } from '@midwayjs/core';
import { CoolEvent, Event } from '@cool-midway/core';
import { UserInfoService } from '../service/info';

/**
 * 用户角色事件
 */
@Provide()
@Scope(ScopeEnum.Singleton)
@CoolEvent()
export class UserRoleEvent {
  @Inject()
  userInfoService: UserInfoService;

  /**
   * 监听团队成员数量变化
   * @param userId 团队负责人ID
   * @param memberCount 成员数量
   */
  @Event('teamMemberCountChanged')
  async onTeamMemberCountChanged(userId: number, memberCount: number) {
    await this.userInfoService.autoUpgradeRole(userId, memberCount);
  }
}
