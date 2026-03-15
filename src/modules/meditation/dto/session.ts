import { Rule, RuleType } from '@midwayjs/validate';

/**
 * 冥想开始请求
 * @example
 * {
 *   "sn": "DEVICE-001",
 *   "targetDuration": 20
 * }
 */
export class MeditationStartDTO {
  /**
   * 设备序列号
   * @example "DEVICE-001"
   */
  @Rule(RuleType.string().required())
  sn: string;

  /**
   * 目标时长（分钟）
   * @example 20
   */
  @Rule(RuleType.number().required())
  targetDuration: number;

  /**
   * 冥想类型
   * 1: 设备冥想, 2: 无设备冥想
   * @example 1
   */
  @Rule(RuleType.number())
  type: number;
}

/**
 * 冥想结束请求
 * @example
 * {
 *   "sessionId": 1
 * }
 */
export class MeditationEndDTO {
  /**
   * 会话ID
   * @example 1
   */
  @Rule(RuleType.number().required())
  sessionId: number;
}

/**
 * 冥想状态轮询
 * @example
 * {
 *   "sessionId": 1
 * }
 */
export class MeditationPollDTO {
  /**
   * 会话ID (可选，不传则自动查找当前进行中的会话)
   * @example 1
   */
  @Rule(RuleType.number())
  sessionId: number;
}
