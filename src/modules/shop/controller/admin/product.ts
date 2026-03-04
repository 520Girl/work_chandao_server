import { BaseController, CoolController } from '@cool-midway/core';
import { ShopProductEntity } from '../../entity/product';

/**
 * 商品管理
 */
@CoolController({
  prefix: '/admin/shop/product',
  api: ['add', 'delete', 'update', 'info', 'list', 'page'],
  entity: ShopProductEntity,
})
export class AdminShopProductController extends BaseController {}
