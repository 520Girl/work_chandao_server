import { Rule, RuleType } from '@midwayjs/validate';

/**
 * 商品分页查询参数
 */
export class ShopProductPageDTO {
  /**
   * 页码
   * @example 1
   */
  @Rule(RuleType.number().default(1))
  page?: number;

  /**
   * 每页数量
   * @example 20
   */
  @Rule(RuleType.number().default(20))
  size?: number;

  /**
   * 搜索关键字
   * @example "商品名称"
   */
  @Rule(RuleType.string())
  keyWord?: string;
}
