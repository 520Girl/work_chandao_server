import { Rule, RuleType } from '@midwayjs/validate';

export class DeviceMacDTO {
  @Rule(RuleType.string().required())
  mac: string;
}

export class DeviceSetWarningSettingAppDTO {
  @Rule(RuleType.string().required())
  mac: string;

  @Rule(RuleType.boolean().optional())
  is_hr_message?: boolean;

  @Rule(RuleType.boolean().optional())
  is_hr_voice?: boolean;

  @Rule(RuleType.number().optional())
  hr_too_fast?: number;

  @Rule(RuleType.number().optional())
  hr_too_slow?: number;

  @Rule(RuleType.boolean().optional())
  is_br_message?: boolean;

  @Rule(RuleType.boolean().optional())
  is_br_voice?: boolean;

  @Rule(RuleType.number().optional())
  br_too_fast?: number;

  @Rule(RuleType.number().optional())
  br_too_slow?: number;

  @Rule(RuleType.boolean().optional())
  is_outbed_message?: boolean;

  @Rule(RuleType.boolean().optional())
  is_outbed_voice?: boolean;

  @Rule(RuleType.number().optional())
  outbed_exceed?: number;

  @Rule(RuleType.string().optional())
  outbed_start_time?: string;

  @Rule(RuleType.string().optional())
  outbed_end_time?: string;

  @Rule(RuleType.boolean().optional())
  is_sos_message?: boolean;

  @Rule(RuleType.boolean().optional())
  is_sos_voice?: boolean;

  @Rule(RuleType.boolean().optional())
  is_apnea_message?: boolean;

  @Rule(RuleType.boolean().optional())
  is_apnea_voice?: boolean;

  @Rule(RuleType.array().optional())
  phone_list?: string[];
}

