
import { Inject, Provide } from '@midwayjs/core';
import { BaseService, CoolCommException, CoolEventManager } from '@cool-midway/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import { MedalTemplateEntity } from '../entity/template';
import { UserMedalEntity } from '../entity/user_medal';
import { Context } from '@midwayjs/koa';

/**
 * 勋章发放服务
 */
@Provide()
export class MedalAwardService extends BaseService {
  @InjectEntityModel(MedalTemplateEntity)
  medalTemplateEntity: Repository<MedalTemplateEntity>;

  @InjectEntityModel(UserMedalEntity)
  userMedalEntity: Repository<UserMedalEntity>;

  @Inject()
  ctx: Context;

  @Inject()
  coolEventManager: CoolEventManager;

  /**
   * 检查并自动发放勋章
   * @param userId 用户ID
   * @param type 触发类型
   * @param data 上下文数据
   */
  async checkAndAward(userId: number, type: string, data: any) {
    // 1. 获取该类型所有激活的勋章模板
    const templates = await this.medalTemplateEntity.find({
      where: { type, isActive: 1 },
    });

    for (const template of templates) {
      // 2. 检查是否满足条件
      if (await this.checkCondition(template.condition, data)) {
        // 3. 检查是否已获得
        const exists = await this.userMedalEntity.findOneBy({
          userId,
          medalId: template.id,
        });

        if (!exists) {
          // 4. 发放勋章
          await this.awardMedal(userId, template);
        }
      }
    }
  }

  /**
   * 校验条件逻辑
   */
  private async checkCondition(condition: any, data: any): Promise<boolean> {
    if (!condition) return false;

    switch (condition.type) {
      // 冥想：连续天数
      case 'daily_meditation':
        return data.consecutiveDays >= condition.count;
      
      // 冥想：总时长
      case 'total_duration':
        return data.totalDuration >= condition.minutes;

      // 活动：参与次数
      case 'activity_join':
        return data.joinCount >= condition.count;

      // 社群：点赞数
      case 'post_like':
        return data.likeCount >= condition.count;

      // 成长：角色等级
      case 'role_level':
        return data.roleLevel >= condition.level;

      default:
        return false;
    }
  }

  /**
   * 执行发放动作
   */
  async awardMedal(userId: number, template: MedalTemplateEntity) {
    await this.userMedalEntity.save({
      userId,
      medalId: template.id,
      obtainedAt: new Date(),
      level: template.level,
    });

    // 触发事件，用于 Socket 通知
    this.coolEventManager.emit('medalAwarded', {
      userId,
      medalName: template.name,
      icon: template.icon,
    });
    
    // 记录日志
    this.ctx.logger.info(`用户 ${userId} 获得勋章: ${template.name}`);
  }

  /**
   * 手动发放接口
   */
  async manualAward(userId: number, medalId: number) {
    const template = await this.medalTemplateEntity.findOneBy({ id: medalId });
    if (!template) throw new CoolCommException('勋章不存在');
    
    const exists = await this.userMedalEntity.findOneBy({ userId, medalId });
    if (exists) throw new CoolCommException('用户已拥有该勋章');

    await this.awardMedal(userId, template);
  }
  
  /**
   * 获取用户勋章列表
   */
  async getUserMedals(userId: number) {
      return await this.userMedalEntity.find({
          where: { userId },
          order: { obtainedAt: 'DESC' }
      });
  }
}
