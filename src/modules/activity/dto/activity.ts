import { Rule, RuleType } from '@midwayjs/validate';

/**
 * 参加活动请求
 * @example
 * {
 *   "id": 1
 * }
 */
export class ActivityJoinDTO {
  /**
   * 活动ID
   * @example 1
   */
  @Rule(RuleType.number().required())
  id: number;
}
