import { Provide } from '@midwayjs/core';
import { BaseService } from '@cool-midway/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import { ShopProductEntity } from '../entity/product';

/**
 * 商品服务
 */
@Provide()
export class ShopProductService extends BaseService {
  @InjectEntityModel(ShopProductEntity)
  shopProductEntity: Repository<ShopProductEntity>;

  /**
   * 分页查询
   */
  async page(query) {
    return this.sqlRenderPage(
      `
        SELECT
            a.id,
            a.name,
            a.price,
            a.mainImage,
            a.isCommission
        FROM
            shop_product a
        WHERE 1=1
            ${this.setSql(query.keyWord, 'AND a.name LIKE ?', [`%${query.keyWord}%`])}
        ORDER BY a.createTime DESC
      `,
      query,
      false
    );
  }
}
