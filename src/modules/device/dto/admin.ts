import { Rule, RuleType } from '@midwayjs/validate';

/**
 * 设备强制解绑请求
 * 管理员可以强制解除用户和设备的绑定关系
 * @example
 * {
 *   "sn": "DEVICE-001"
 * }
 */
export class DeviceForceUnbindDTO {
  /**
   * 设备序列号
   * @example "DEVICE-001"
   */
  @Rule(RuleType.string().required())
  sn: string;
}
