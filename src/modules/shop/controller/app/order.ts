import { Body, Get, Inject, Post, Query } from '@midwayjs/core';
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
    return this.ok(
      await this.shopOrderService.create({
        ...body,
        userId: this.ctx.user.id,
      })
    );
  }

  @Post('/page', { summary: '订单分页列表' })
  async page(@Body() body = {}) {
    return this.ok(
      await this.shopOrderService.page({
        ...body,
        userId: this.ctx.user.id,
      })
    );
  }

  @Get('/detail', { summary: '订单详情' })
  async detail(@Query('id') id: string) {
    const orderId = Number(id);
    if (!Number.isFinite(orderId) || orderId <= 0) {
      return this.fail('id 参数错误');
    }
    return this.ok(
      await this.shopOrderService.detail(orderId, this.ctx.user.id)
    );
  }

  @Post('/cancel', { summary: '取消订单' })
  async cancel(@Body() body) {
    const { id } = body;
    await this.shopOrderService.cancel(id, this.ctx.user.id);
    return this.ok();
  }
}
