import { BaseController, CoolController } from '@cool-midway/core';
import { Body, Inject, Put } from '@midwayjs/core';
import { ShopOrderEntity } from '../../entity/order';
import { UserInfoEntity } from '../../../user/entity/info';
import { ShopOrderService } from '../../service/order';
import { Validate } from '@midwayjs/validate';
import { ShopOrderShippedDTO } from '../../dto/admin';

/**
 * 订单管理
 */
@CoolController({
  api: ['add', 'delete', 'update', 'info', 'list', 'page'],
  entity: ShopOrderEntity,
  pageQueryOp: {
    keyWordLikeFields: ['a.orderNo'],
    fieldEq: ['a.status'],
    select: ['a.*', 'b.nickName as buyerName', 'c.nickName as commissionName'],
    join: [
      {
        entity: UserInfoEntity,
        alias: 'b',
        condition: 'a.userId = b.id',
      },
      {
        entity: UserInfoEntity,
        alias: 'c',
        condition: 'a.commissionRecipientId = c.id',
      },
    ],
  },
})
export class AdminShopOrderController extends BaseController {
  @Inject()
  shopOrderService: ShopOrderService;

  @Put('/shipped', { summary: '订单发货' })
  @Validate()
  async shipped(@Body() body: ShopOrderShippedDTO) {
    await this.shopOrderService.shipped(body.id);
    return this.ok();
  }
}
