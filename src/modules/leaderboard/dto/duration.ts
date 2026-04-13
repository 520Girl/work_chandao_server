import { Rule, RuleType } from '@midwayjs/validate';

export class LeaderboardDurationQueryDTO {
  @Rule(RuleType.string().default('week').allow('day', 'week', 'month', 'total'))
  range?: string;

  @Rule(RuleType.number())
  teamId?: number;

  @Rule(RuleType.number().default(1).min(1))
  page?: number;

  @Rule(RuleType.number().default(20).min(1).max(100))
  size?: number;
}
