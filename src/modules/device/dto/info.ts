import { Rule, RuleType } from '@midwayjs/validate';

/**
 * 设备绑定请求
 * @example
 * {
 *   "sn": "DEVICE-001",
 *   "model": "WearableDevice-Pro",
 *   "mac": "00:1A:2B:3C:4D:5E"
 * }
 */
export class DeviceBindDTO {
  /**
   * 设备序列号
   * @example "DEVICE-001"
   */
  @Rule(RuleType.string().required())
  sn: string;

  /**
   * 设备型号
   * @example "WearableDevice-Pro"
   */
  @Rule(RuleType.string().required())
  model: string;

  /**
   * MAC 地址
   * @example "00:1A:2B:3C:4D:5E"
   */
  @Rule(RuleType.string().required())
  mac: string;
}

/**
 * 设备解绑请求
 * @example
 * {
 *   "sn": "DEVICE-001"
 * }
 */
export class DeviceUnbindDTO {
  /**
   * 设备序列号
   * @example "DEVICE-001"
   */
  @Rule(RuleType.string().required())
  sn: string;
}
