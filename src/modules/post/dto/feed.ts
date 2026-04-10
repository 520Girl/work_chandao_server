import { Rule, RuleType } from '@midwayjs/validate';

export class PostFeedQueryDTO {
  /**
   * 页码
   * @default 1
   * @example 1
   */
  @Rule(RuleType.number().default(1))
  page?: number;

  /**
   * 每页大小
   * @default 20
   * @example 20
   */
  @Rule(RuleType.number().default(20))
  size?: number;

  /**
   * 发布状态筛选：0全部（仅 1/2） 1未发布(待审核) 2已发布
   * @default 2
   * @example 2
   */
  @Rule(RuleType.number().valid(0, 1, 2).default(2))
  publishStatus?: number;
}

