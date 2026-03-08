import { Rule, RuleType } from '@midwayjs/validate';

/**
 * 通过邀请码加入团队
 * @example
 * { "code": "a1b2c3d4e5f6" }
 */
export class UserJoinByInviteDTO {
  /**
   * 邀请码
   */
  @Rule(RuleType.string().required())
  code: string;
}

/**
 * 退出团队
 * @example
 * { "teamId": 1 }
 */
export class UserQuitTeamDTO {
  @Rule(RuleType.number().required())
  teamId: number;
}
