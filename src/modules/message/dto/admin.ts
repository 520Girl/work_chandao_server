import { Rule, RuleType } from '@midwayjs/validate';

export class MessageAddDTO {
  @Rule(RuleType.string().required())
  title: string;

  @Rule(RuleType.string().required())
  content: string;

  @Rule(RuleType.number().optional())
  targetType?: number;

  @Rule(RuleType.array().optional())
  userIds?: number[];
}

export class MessageDeliveryPageDTO {
  @Rule(RuleType.number().required())
  messageId: number;

  @Rule(RuleType.number().optional())
  page?: number;

  @Rule(RuleType.number().optional())
  size?: number;

  @Rule(RuleType.number().optional())
  readStatus?: number;

  @Rule(RuleType.number().optional())
  deleteStatus?: number;
}

export class MessageFailPageDTO {
  @Rule(RuleType.number().required())
  messageId: number;

  @Rule(RuleType.number().optional())
  page?: number;

  @Rule(RuleType.number().optional())
  size?: number;
}
