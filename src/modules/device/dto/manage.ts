
import { Rule, RuleType } from '@midwayjs/validate';

/**
 * 获取设备信息请求
 */
export class DeviceInfoDTO {
  @Rule(RuleType.string().required())
  mac: string;
}

/**
 * 获取设备实时数据请求
 */
export class DeviceRealtimeDTO {
  @Rule(RuleType.string().required())
  mac: string;
}

/**
 * 获取预警信息请求
 */
export class DeviceWarningInfoDTO {
  @Rule(RuleType.string().required())
  mac: string;
}

/**
 * 获取预警设置请求
 */
export class DeviceWarningSettingDTO {
  @Rule(RuleType.string().required())
  mac: string;
}

/**
 * 设置预警参数请求
 */
export class DeviceSetWarningSettingDTO {
  @Rule(RuleType.number().optional())
  id?: number;

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

  @Rule(RuleType.number().optional())
  heartRateHigh?: number;

  @Rule(RuleType.number().optional())
  heartRateLow?: number;

  @Rule(RuleType.number().optional())
  breathRateHigh?: number;

  @Rule(RuleType.number().optional())
  breathRateLow?: number;

  @Rule(RuleType.number().optional())
  inBedDuration?: number;

  @Rule(RuleType.number().optional())
  leaveBedDuration?: number;
}

/**
 * 获取睡眠报告列表请求
 */
export class DeviceSleepReportDTO {
  @Rule(RuleType.string().required())
  mac: string;

  @Rule(RuleType.string().required())
  startDate: string;

  @Rule(RuleType.string().required())
  endDate: string;
}

/**
 * 获取睡眠报告详情请求
 */
export class DeviceSleepReportDetailDTO {
  @Rule(RuleType.string().required())
  reportId: string;
}

/**
 * 语音预警请求
 */
export class DeviceVoiceAlertDTO {
  @Rule(RuleType.string().required())
  mac: string;

  @Rule(RuleType.number().required())
  type: number;
}
