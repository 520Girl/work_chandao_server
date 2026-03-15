import { BaseController, CoolController } from '@cool-midway/core';
import { Body, Inject, Post, Provide } from '@midwayjs/core';
import { Validate } from '@midwayjs/validate';
import { MessageInfoEntity } from '../../entity/info';
import { MessageInfoService } from '../../service/info';
import { TeamInfoEntity } from '../../../team/entity/info';
import { BaseSysUserEntity } from '../../../base/entity/sys/user';
import { MessageDeliveryPageDTO, MessageFailPageDTO } from '../../dto/admin';

@Provide()
@CoolController({
  api: ['add', 'delete', 'update', 'info', 'page'],
  entity: MessageInfoEntity,
  service: MessageInfoService,
  pageQueryOp: {
    keyWordLikeFields: ['title', 'content', 'templateKey', 'bizType', 't.name', 'u.name', 'u.username'],
    fieldEq: ['targetType', 'teamId', 'senderType', 'senderId', 'contentType', 'templateKey', 'bizType', 'bizId'],
    select: ['a.*', 't.name as teamName', 'u.name as creatorName', 'u.username as creatorUsername'],
    join: [
      {
        entity: TeamInfoEntity,
        alias: 't',
        condition: 'a.teamId = t.id',
        type: 'leftJoin',
      },
      {
        entity: BaseSysUserEntity,
        alias: 'u',
        condition: 'a.creatorId = u.id',
        type: 'leftJoin',
      },
    ],
    where: async (ctx) => {
      const body = ctx?.request?.body ?? {};
      const startTime = body?.startTime;
      const endTime = body?.endTime;
      if (startTime && endTime) {
        return [['a.sendTime BETWEEN :startTime AND :endTime', { startTime, endTime }]];
      }
      if (startTime) {
        return [['a.sendTime >= :startTime', { startTime }]];
      }
      if (endTime) {
        return [['a.sendTime <= :endTime', { endTime }]];
      }
      return [];
    },
  },
})
export class AdminMessageInfoController extends BaseController {
  @Inject()
  messageInfoService: MessageInfoService;

  @Post('/deliveryPage', { summary: '投递明细分页' })
  @Validate()
  async deliveryPage(@Body() body: MessageDeliveryPageDTO) {
    return this.ok(await this.messageInfoService.deliveryPage(body));
  }

  @Post('/failPage', { summary: '失败名单分页' })
  @Validate()
  async failPage(@Body() body: MessageFailPageDTO) {
    return this.ok(await this.messageInfoService.failPage(body));
  }
}
