import { Provide, Scope, ScopeEnum, App } from '@midwayjs/core';
import { CoolEvent, Event } from '@cool-midway/core';
import { IMidwayApplication } from '@midwayjs/core';

/**
 * 活动打卡提醒事件
 * 仅针对团队专属活动，未打卡的指定团队成员收到消息推送
 */
@Provide()
@Scope(ScopeEnum.Singleton)
@CoolEvent()
export class ActivityCheckinReminderEvent {
  @App()
  app: IMidwayApplication;

  @Event('activityCheckinReminder')
  async onCheckinReminder(data: {
    userId: number;
    activityId: number;
    activityTitle: string;
  }) {
    const nsp = this.app['io']?.of('/');
    if (nsp) {
      try {
        nsp.to(`user:${data.userId}`).emit('activityCheckinReminder', {
          type: 'activityCheckinReminder',
          activityId: data.activityId,
          activityTitle: data.activityTitle,
          message: `今日活动「${data.activityTitle}」尚未打卡，请及时完成~`,
        });
      } catch (e) {
        console.error('[ActivityCheckinReminder] Socket推送失败', e);
      }
    }
  }
}
