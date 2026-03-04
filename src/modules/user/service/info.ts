
import { Inject, Provide } from '@midwayjs/core';
import { BaseService, CoolCommException, CoolEventManager } from '@cool-midway/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import { UserInfoEntity } from '../entity/info';
import { UserSmsService } from './sms';
import { UserWxService } from './wx';
import * as md5 from 'md5';
import { UserRole } from '../../../comm/const';
import { TeamInfoEntity } from '../../team/entity/info';

/**
 * 用户信息服务
 */
@Provide()
export class UserInfoService extends BaseService {
  @InjectEntityModel(UserInfoEntity)
  userInfoEntity: Repository<UserInfoEntity>;

  @InjectEntityModel(TeamInfoEntity)
  teamInfoEntity: Repository<TeamInfoEntity>;

  @Inject()
  userSmsService: UserSmsService;

  @Inject()
  userWxService: UserWxService;

  @Inject()
  coolEventManager: CoolEventManager;

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
