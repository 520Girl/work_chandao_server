import { Rule, RuleType } from '@midwayjs/validate';

/**
 * 设备数据推送请求
 * 用于设备将传感器数据推送到服务器
 * @example
 * {
 *   "sn": "DEVICE-001",
 *   "secret_key": "29c0b6ed48d52c76122cc003fd79383c",
 *   "heart": 75,
 *   "breath": 20,
 *   "movement": 30,
 *   "timestamp": 1677398400000
 * }
 */
export class DevicePushDataDTO {
  /**
   * 设备序列号
   * @example "DEVICE-001"
   */
  @Rule(RuleType.string().required())
  sn: string;

  /**
   * 密钥验证（需与后端配置一致）
   * @example "29c0b6ed48d52c76122cc003fd79383c"
   */
  @Rule(RuleType.string().required())
  secret_key: string;

  /**
   * 心率数据 (bpm)
   * @example 75
   */
  @Rule(RuleType.number())
  heart?: number;

  /**
   * 呼吸频率 (breaths/min)
   * @example 20
   */
  @Rule(RuleType.number())
  breath?: number;

  /**
   * 动作数据 (0-100,百分比)
   * @example 30
   */
  @Rule(RuleType.number())
  movement?: number;

  /**
   * 时间戳(毫秒)
   * @example 1677398400000
   */
  @Rule(RuleType.number())
  timestamp?: number;
}
