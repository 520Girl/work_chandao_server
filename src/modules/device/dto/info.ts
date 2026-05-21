import { Rule, RuleType } from '@midwayjs/validate';

/**
 * 设备绑定请求
 * @example
 * { "sn": "SM022509000054" }
 * 或兼容旧客户端：{ "sn": "...", "model": "...", "mac": "..." }
 */
export class DeviceBindDTO {
  /**
   * 设备序列号
   * @example "SM022509000054"
   */
  @Rule(RuleType.string().required())
  sn: string;

  /**
   * 设备型号；不传时由 GetDeviceInfo(mac=SN) 返回的 model 写入
   */
  @Rule(RuleType.string().optional().allow('', null))
  model?: string;

  /**
   * MAC 地址；不传时由 GetDeviceInfo(mac=SN) 返回的 mac 写入
   */
  @Rule(RuleType.string().optional().allow('', null))
  mac?: string;
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
