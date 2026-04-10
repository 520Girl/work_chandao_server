import { Rule, RuleType } from '@midwayjs/validate';

export class AppTeamMemberPageQueryDTO {
  /**
   * 团队ID；不传默认取 user_info.firstTeamId
   * @example 1
   */
  @Rule(RuleType.number())
  teamId?: number;

  /**
   * 成员筛选：0全部 1仅负责人 2仅成员
   * @default 0
   * @example 0
   */
  @Rule(RuleType.number().valid(0, 1, 2).default(0))
  role?: number;

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
}

