import { Rule, RuleType } from '@midwayjs/validate';

/**
 * 加入团队请求
 * @example
 * {
 *   "teamId": 1
 * }
 */
export class UserJoinTeamDTO {
  /**
   * 团队ID
   * @example 1
   */
  @Rule(RuleType.number().required())
  teamId: number;
}
