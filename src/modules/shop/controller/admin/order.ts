import { BaseController, CoolController } from '@cool-midway/core';
import { Body, Inject, Put } from '@midwayjs/core';
import { ShopOrderEntity } from '../../entity/order';
import { UserInfoEntity } from '../../../user/entity/info';
import { ShopOrderService } from '../../service/order';
import { Validate } from '@midwayjs/validate';
import { ShopOrderShippedDTO } from '../../dto/admin';

import { ShopProductEntity } from '../../entity/product';
import { UserAddressEntity } from '../../../user/entity/address';

/**
 * 订单管理
 */
@CoolController({
  api: ['add', 'delete', 'update', 'info', 'list', 'page'],
  entity: ShopOrderEntity,
  pageQueryOp: {
    keyWordLikeFields: ['a.orderNo', 'b.nickName', 'd.name'],
    fieldEq: ['a.status', 'a.userId'],
    select: [
      'a.*',
      'b.nickName as buyerName',
      'c.nickName as commissionName',
      'd.name as productName',
      'd.mainImage as productImage',
      'd.price as productPrice',
      'e.contact',
      'e.phone',
      'e.province',
      'e.city',
      'e.district',
      'e.address',
    ],
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
        type: 'leftJoin',
      },
      {
        entity: ShopProductEntity,
        alias: 'd',
        condition: 'a.productId = d.id',
        type: 'leftJoin',
      },
      {
        entity: UserAddressEntity,
        alias: 'e',
        condition: 'a.addressId = e.id',
        type: 'leftJoin',
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
