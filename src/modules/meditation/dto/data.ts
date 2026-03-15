import { Rule, RuleType } from '@midwayjs/validate';

export class MeditationDataWaveDTO {
  @Rule(RuleType.number().required())
  id: number;
}

