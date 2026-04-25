import { Rule, RuleType } from '@midwayjs/validate';

export class LeaderboardDurationQueryDTO {
  @Rule(RuleType.string().default('week').allow('day', 'week', 'month', 'total'))
  range?: string;

  /** 不传或 null：全站；正整数：该团队在职成员（exitType=0） */
  @Rule(RuleType.number().optional().allow(null))
  teamId?: number | null;

  @Rule(RuleType.number().default(1).min(1))
  page?: number;

  @Rule(RuleType.number().default(20).min(1).max(100))
  size?: number;
}
