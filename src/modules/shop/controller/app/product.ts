import { Body, Get, Inject, Post, Provide } from '@midwayjs/core';
import { BaseController, CoolController } from '@cool-midway/core';
import { ShopProductEntity } from '../../entity/product';
import { ShopProductService } from '../../service/product';
import { ShopProductPageDTO } from '../../dto/product';
import { Validate } from '@midwayjs/validate';

/**
 * 商品
 */
@Provide()
@CoolController({
  api: ['page', 'info'],
  entity: ShopProductEntity,
  service: ShopProductService,
  pageQueryOp: {
    keyWordLikeFields: ['name'],
    select: ['id', 'name', 'price', 'mainImage', 'isCommission'],
  },
})
export class AppShopProductController extends BaseController {
  @Inject()
  shopProductService: ShopProductService;

  @Post('/page', { summary: '分页查询' })
  @Validate()
  async page(@Body() query: ShopProductPageDTO = new ShopProductPageDTO()) {
    return this.ok(await this.shopProductService.page(query));
  }
}
