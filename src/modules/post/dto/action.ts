import { Rule, RuleType } from '@midwayjs/validate';

export class PostDeleteDTO {
  @Rule(RuleType.number().required())
  id: number;
}

