import { Rule, RuleType } from '@midwayjs/validate';

/**
 * SQL分页查询请求
 * @example
 * {
 *   "page": 1,
 *   "size": 20,
 *   "title": "商品名称"
 * }
 */
export class DemoGoodsQueryDTO {
  /**
   * 页码
   * @example 1
   */
  @Rule(RuleType.number())
  page?: number;

  /**
   * 每页大小
   * @example 20
   */
  @Rule(RuleType.number())
  size?: number;

  /**
   * 商品标题（用于搜索）
   * @example "商品名称"
   */
  @Rule(RuleType.string())
  title?: string;
}
