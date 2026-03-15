
import { Inject, Provide, Scope, ScopeEnum, App } from '@midwayjs/core';
import { CoolEvent, Event } from '@cool-midway/core';
import { IMidwayApplication } from '@midwayjs/core';
import { Context } from '@midwayjs/socketio';
import { MessageInfoService } from '../../message/service/info';

/**
 * 勋章通知事件
 */
@Provide()
@Scope(ScopeEnum.Singleton)
@CoolEvent()
export class MedalNotifyEvent {
  @App()
  app: IMidwayApplication;

  @Inject()
  ctx: Context;

  @Inject()
  messageInfoService: MessageInfoService;

  /**
   * 勋章发放成功后，通过 Socket 推送
   */
  @Event('medalAwarded')
  async onMedalAwarded(data: { userId: number; medalName: string; icon: string }) {
    await this.messageInfoService.sendSystemToUsers({
      templateKey: 'MEDAL_AWARDED',
      targetType: 1,
      userIds: [data.userId],
      bizType: 'medal_awarded',
      templateParams: { medalName: data.medalName, icon: data.icon },
    });

    // Socket 推送（可选，项目未配置 socket 时跳过）
    let socketService = null;
    try {
      socketService = await this.app.getApplicationContext().getAsync('socketService');
    } catch {
      // socketService 未注册时忽略
    }
    if (socketService) {
        // 假设 socketService 封装了推送逻辑，或者直接用 @midwayjs/socketio 的 namespace
        // 这里示意性调用，具体依赖项目 socket 实现
        try {
            // socketService.emitToUser(data.userId, 'newMedal', data);
            // 如果项目没有封装好的 socketService，可以用原生 nsp
             const nsp = this.app['io']?.of('/');
             if(nsp) {
                 nsp.to(`user:${data.userId}`).emit('newMedal', data);
             }
        } catch (e) {
            console.error('Socket推送失败', e);
        }
    }
  }
}
