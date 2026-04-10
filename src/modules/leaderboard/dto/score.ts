import { Rule, RuleType } from '@midwayjs/validate';

export class LeaderboardScoreQueryDTO {
  /**
   * 时间范围：day/week/month/total
   * @default "week"
   * @example "week"
   */
  @Rule(RuleType.string().default('week'))
  range?: string;

  /**
   * 团队ID；不传表示全站榜
   * @example 1
   */
  @Rule(RuleType.number())
  teamId?: number;

  /**
   * 页码
   * @default 1
   * @example 1
   */
  @Rule(RuleType.number().default(1))
  page?: number;

  /**
   * 每页大小（最大 100）
   * @default 20
   * @example 20
   */
  @Rule(RuleType.number().default(20))
  size?: number;
}

