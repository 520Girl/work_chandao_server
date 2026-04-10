import { Rule, RuleType } from '@midwayjs/validate';

export class UserLocationReportDTO {
  @Rule(RuleType.number())
  lat?: number;

  @Rule(RuleType.number())
  lng?: number;

  @Rule(RuleType.number())
  accuracy?: number;

  @Rule(RuleType.string())
  province?: string;

  @Rule(RuleType.string())
  city?: string;

  @Rule(RuleType.string())
  scene?: string;
}

export class UserLocationReverseDTO {
  @Rule(RuleType.number().required())
  lat: number;

  @Rule(RuleType.number().required())
  lng: number;
}
