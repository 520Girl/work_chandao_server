import { ALL, Body, Get, Inject, Post, Query } from '@midwayjs/core';
import { BaseController, CoolController } from '@cool-midway/core';
import { Validate } from '@midwayjs/validate';
import { MessageInfoService } from '../../service/info';
import { MessageActionDTO, MessageDeleteDTO, MessageInfoDTO, MessagePageDTO, MessageReadDTO } from '../../dto/app';
import { ActivityInfoService } from '../../../activity/service/info';

@CoolController({
  prefix: '/app/message',
  api: [],
})
export class AppMessageInfoController extends BaseController {
  @Inject()
  ctx;

  @Inject()
  messageInfoService: MessageInfoService;

  @Inject()
  activityInfoService: ActivityInfoService;

  @Post('/page', { summary: '消息分页' })
  @Validate()
  async pageList(
    @Body() body: MessagePageDTO,
    @Query(ALL) query: Partial<MessagePageDTO>
  ) {
    const input: MessagePageDTO = {
      page: body.page ?? (query.page as any),
      size: body.size ?? (query.size as any),
      readStatus:
        body.readStatus != null
          ? body.readStatus
          : (query.readStatus as any),
      senderType:
        body.senderType != null
          ? body.senderType
          : (query.senderType as any),
    };
    return this.ok(
      await this.messageInfoService.pageForUser(this.ctx.user.id, input)
    );
  }

  @Get('/unread-count', { summary: '未读数量' })
  async unreadCount() {
    return this.ok(await this.messageInfoService.unreadCount(this.ctx.user.id));
  }

  @Get('/info', { summary: '消息详情' })
  @Validate()
  async messageInfo(@Query() query: MessageInfoDTO) {
    const msg = await this.messageInfoService.infoForUser(
      this.ctx.user.id,
      Number(query.messageId)
    );
    if (!msg) return this.ok(null);
    return this.ok(msg);
  }

  @Post('/read', { summary: '标记已读' })
  @Validate()
  async read(@Body() body: MessageReadDTO) {
    await this.messageInfoService.markRead(this.ctx.user.id, body.messageId);
    return this.ok();
  }

  @Post('/delete', { summary: '删除消息' })
  @Validate()
  async deleteMsg(@Body() body: MessageDeleteDTO) {
    const ids = Array.isArray(body?.ids) ? body.ids : [];
    const messageId = body?.messageId != null ? Number(body.messageId) : null;

    if (ids.length) {
      for (const id of ids) {
        const mid = Number(id);
        if (mid > 0) await this.messageInfoService.deleteForUser(this.ctx.user.id, mid);
      }
      return this.ok({ deleted: ids.length });
    }

    if (!messageId || messageId <= 0) {
      return this.ok({ deleted: 0, reason: '消息ID不正确~' });
    }

    await this.messageInfoService.deleteForUser(this.ctx.user.id, messageId);
    return this.ok();
  }

  @Post('/action', { summary: '消息动作（如活动参与）' })
  @Validate()
  async action(@Body() body: MessageActionDTO) {
    const userId = this.ctx.user.id;
    const messageId = Number(body.messageId);
    console.log('message action', { userId, messageId, body });
    const msg = await this.messageInfoService.messageInfoEntity.findOneBy({ id: messageId });
    console.log(msg);
    if (!msg) return this.ok({ handled: false, reason: '消息不存在~' });

    if (msg.targetType !== 0) {
      const deliver = await this.messageInfoService.messageUserEntity.findOne({
        where: { userId, messageId, deleteStatus: 0 },
      });
      if (!deliver) return this.ok({ handled: false, reason: '没有权限~' });
    }

    const bizType = body.bizType || msg.bizType;
    const bizId = body.bizId || msg.bizId;

    if (!bizType || !bizId) {
      await this.messageInfoService.markRead(userId, messageId);
      return this.ok({ handled: false });
    }

    const joinBizTypes = new Set(['activity_published', 'activity_assigned']);
    if (joinBizTypes.has(String(bizType))) {
      await this.activityInfoService.joinActivity(userId, Number(bizId));
      await this.messageInfoService.markRead(userId, messageId);
      return this.ok({ handled: true, bizType, bizId });
    }

    await this.messageInfoService.markRead(userId, messageId);
    return this.ok({ handled: false, bizType, bizId });
  }
}
