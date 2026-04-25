import { Rule, RuleType } from '@midwayjs/validate';

/**
 * 后台设置用户冥想累计补偿（累计天、累计时长）
 */
export class UserSetMeditationPracticeOffsetsDTO {
  @Rule(RuleType.number().required().integer().min(1))
  userId: number;

  @Rule(RuleType.number().optional().integer().min(0).max(2147483647))
  meditationExtraSeconds?: number;

  @Rule(RuleType.number().optional().integer().min(0).max(36500))
  meditationExtraDays?: number;
}
