import { Provide, Scope, ScopeEnum } from '@midwayjs/core';
import { CoolEvent, Event } from '@cool-midway/core';
import { MessageInfoService } from '../../message/service/info';
import { Inject } from '@midwayjs/core';

/**
 * 活动打卡提醒事件
 * 仅针对团队专属活动，未打卡的指定团队成员收到消息推送
 */
@Provide()
@Scope(ScopeEnum.Singleton)
@CoolEvent()
export class ActivityCheckinReminderEvent {
  @Inject()
  messageInfoService: MessageInfoService;

  @Event('activityCheckinReminder')
  async onCheckinReminder(data: {
    userIds: number[];
    activityId: number;
    activityTitle: string;
    teamId: number;
  }) {
    const userIds = Array.isArray(data?.userIds) ? data.userIds.filter((id) => Number(id) > 0) : [];
    if (!userIds.length) return;

    await this.messageInfoService.sendSystemToUsers({
      templateKey: 'ACTIVITY_CHECKIN_REMINDER',
      targetType: 1,
      userIds,
      teamId: data.teamId ?? null,
      bizType: 'activity_checkin_reminder',
      bizId: Number(data.activityId),
      templateParams: {
        activityId: Number(data.activityId),
        title: data.activityTitle,
        teamId: data.teamId ?? null,
      },
    });
  }
}
