import { Rule, RuleType } from '@midwayjs/validate';

export class MessagePageDTO {
  @Rule(RuleType.number().optional())
  page?: number;

  @Rule(RuleType.number().optional())
  size?: number;

  @Rule(RuleType.number().optional())
  readStatus?: number;
}

export class MessageReadDTO {
  @Rule(RuleType.number().required())
  messageId: number;
}

export class MessageDeleteDTO {
  @Rule(RuleType.number().optional())
  messageId?: number;

  @Rule(RuleType.array().items(RuleType.number()).optional())
  ids?: number[];
}

export class MessageActionDTO {
  @Rule(RuleType.number().required())
  messageId: number;

  @Rule(RuleType.string().optional())
  bizType?: string;

  @Rule(RuleType.number().optional())
  bizId?: number;
}
