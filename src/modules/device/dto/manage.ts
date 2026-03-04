
import { Rule, RuleType } from '@midwayjs/validate';

/**
 * Get device info request
 */
export class DeviceInfoDTO {
  @Rule(RuleType.string().required())
  mac: string;
}

/**
 * Get device realtime data request
 */
export class DeviceRealtimeDTO {
  @Rule(RuleType.string().required())
  mac: string;
}

/**
 * Get warning info request
 */
export class DeviceWarningInfoDTO {
  @Rule(RuleType.string().required())
  mac: string;
}

/**
 * Get warning setting request
 */
export class DeviceWarningSettingDTO {
  @Rule(RuleType.string().required())
  mac: string;
}

/**
 * Set warning setting request
 */
export class DeviceSetWarningSettingDTO {
  @Rule(RuleType.string().required())
  mac: string;

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
  
  // Allow other properties dynamically if needed, or strict type them
}

/**
 * Get sleep reports request
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
 * Get sleep report detail request
 */
export class DeviceSleepReportDetailDTO {
  @Rule(RuleType.string().required())
  reportId: string;
}

/**
 * Voice alert request
 */
export class DeviceVoiceAlertDTO {
  @Rule(RuleType.string().required())
  mac: string;

  @Rule(RuleType.number().required())
  type: number;
}
