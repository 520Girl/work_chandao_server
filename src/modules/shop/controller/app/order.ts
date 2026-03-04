import { Body, Get, Inject, Post } from '@midwayjs/core';
import { BaseController, CoolController } from '@cool-midway/core';
import { ShopOrderService } from '../../service/order';
import { ShopOrderCreateDTO } from '../../dto/order';
import { Validate } from '@midwayjs/validate';

/**
 * 订单
 */
@CoolController({
  prefix: '/app/shop/order',
  api: [],
})
export class AppShopOrderController extends BaseController {
  @Inject()
  ctx;

  @Inject()
  shopOrderService: ShopOrderService;

  @Post('/create', { summary: '创建订单' })
  @Validate()
  async create(@Body() body: ShopOrderCreateDTO) {
    const { productId, addressId } = body;
    return this.ok(
      await this.shopOrderService.createOrder(
        this.ctx.user.id,
        productId,
        addressId
      )
    );
  }

  @Get('/list', { summary: '订单列表' })
  async list() {
    return this.ok(await this.shopOrderService.listByUser(this.ctx.user.id));
  }
}
