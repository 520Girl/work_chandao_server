import { Body, Get, Inject, Post } from '@midwayjs/core';
import { BaseController, CoolController } from '@cool-midway/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import { ShopAddressEntity } from '../../entity/address';
import { ShopAddressAddDTO } from '../../dto/order';
import { Validate } from '@midwayjs/validate';

/**
 * 收货地址
 */
@CoolController({
  prefix: '/app/shop/address',
  api: [],
})
export class AppShopAddressController extends BaseController {
  @Inject()
  ctx;

  @InjectEntityModel(ShopAddressEntity)
  shopAddressEntity: Repository<ShopAddressEntity>;

  @Post('/add', { summary: '新增地址' })
  @Validate()
  async addAddress(@Body() body: ShopAddressAddDTO) {
    const address = await this.shopAddressEntity.save({
      ...body,
      userId: this.ctx.user.id,
    });
    return this.ok(address);
  }

  @Get('/list', { summary: '地址列表' })
  async list() {
    return this.ok(await this.shopAddressEntity.findBy({ userId: this.ctx.user.id }));
  }
}
