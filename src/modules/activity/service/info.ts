
import { ILogger, Logger, Provide } from '@midwayjs/core';
import { BaseService, CoolCommException, CoolEventManager } from '@cool-midway/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityInfoEntity } from '../entity/info';
import { ActivityParticipationEntity } from '../entity/participation';
import { ActivityTemplateEntity } from '../entity/template';
import { Inject } from '@midwayjs/core';

/**
 * 活动服务
 */
@Provide()
export class ActivityInfoService extends BaseService {
  @InjectEntityModel(ActivityInfoEntity)
  activityInfoEntity: Repository<ActivityInfoEntity>;

  @InjectEntityModel(ActivityParticipationEntity)
  activityParticipationEntity: Repository<ActivityParticipationEntity>;

  @InjectEntityModel(ActivityTemplateEntity)
  activityTemplateEntity: Repository<ActivityTemplateEntity>;

  @Logger()
  logger: ILogger;

  @Inject()
  coolEventManager: CoolEventManager;

  /**
   * 发布活动
   */
  async createActivity(
    creatorId: number,
    templateId: number,
    title: string,
    startDate: Date,
    endDate: Date,
    content: string,
    isTop: number
  ) {
    const template = await this.activityTemplateEntity.findOneBy({
      id: templateId,
    });
    if (!template) {
      throw new CoolCommException('模板不存在');
    }
    return this.activityInfoEntity.save({
      templateId,
      title,
      startDate,
      endDate,
      content,
      isTop: isTop ? 1 : 0,
      authorId: creatorId,
      status: 1,
    });
  }

  /**
   * 编辑活动
   */
  async updateActivity(
    creatorId: number,
    id: number,
    data: Partial<ActivityInfoEntity>
  ) {
    const activity = await this.activityInfoEntity.findOneBy({ id });
    if (!activity) {
      throw new CoolCommException('活动不存在');
    }
    if (activity.authorId !== creatorId) {
      throw new CoolCommException('无权限编辑');
    }
    if (activity.endDate && activity.endDate < new Date()) {
      throw new CoolCommException('活动已结束');
    }
    await this.activityInfoEntity.update(id, data);
  }

  /**
   * 参加活动
   */
  async joinActivity(userId: number, activityId: number) {
    const activity = await this.activityInfoEntity.findOneBy({ id: activityId });
    if (!activity) {
      throw new CoolCommException('活动不存在');
    }
    const exists = await this.activityParticipationEntity.findOneBy({
      userId,
      activityId,
    });
    if (exists) {
      return exists;
    }
    const result = await this.activityParticipationEntity.save({
      userId,
      activityId,
      applyTime: new Date(),
      checkins: [],
    });

    // 触发活动参与事件
    this.coolEventManager.emit('activityJoined', userId);

    return result;
  }

  /**
   * 每日打卡检查
   */
  async checkDailyCheckin() {
    const today = new Date().toISOString().slice(0, 10);
    const list = await this.activityParticipationEntity.find();
    for (const item of list) {
      const checkins = Array.isArray(item.checkins) ? item.checkins : [];
      const hasToday = checkins.some((d: any) => d?.date === today && d?.checked);
      if (!hasToday) {
        this.logger.info('activity.checkin.miss', {
          userId: item.userId,
          activityId: item.activityId,
        });
      }
    }
  }
}
