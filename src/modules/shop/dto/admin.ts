import { Rule, RuleType } from '@midwayjs/validate';

/**
 * 发货请求
 * @example
 * {
 *   "id": 1
 * }
 */
export class ShopOrderShippedDTO {
  /**
   * 订单ID
   * @example 1
   */
  @Rule(RuleType.number().required())
  id: number;
}

