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
  @Rule(RuleType.string())
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

  @Rule(RuleType.boolean().optional())
  debug?: boolean;
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

/**
 * 会话生理数据详情
 */
export class MeditationDataListDTO {
  /**
   * 会话ID
   * @example 1
   */
  @Rule(RuleType.number().required())
  sessionId: number;
}

export class MeditationReportHistoryPageDTO {
  @Rule(RuleType.number().min(1).optional())
  page: number;

  @Rule(RuleType.number().min(1).max(100).optional())
  size: number;
}

export class MeditationReportDetailDTO {
  @Rule(RuleType.number().required())
  sessionId: number;
}

export class MeditationReportStatisticsDTO {
  @Rule(RuleType.string().valid('day', 'week', 'month').default('week'))
  range: string;
}

/** 单周期汇总（整段） */
export interface MeditationPeriodStats {
  rangeStart: string;
  rangeEnd: string;
  sessionCount: number;
  totalDurationMinutes: number;
  avgHeartRate: number;
  avgBreathRate: number;
  movementCount: number;
  avgMovementPerMinute: number;
}

/** 当前周期汇总：在整段汇总上附带「全局最近一次已结束会话」 */
export interface MeditationCurrentPeriodStats extends MeditationPeriodStats {
  latestSessionId: number;
  latestSessionMinutes: number;
}

/** 将当前/上一周期各拆成 7 个等长时间桶（用于趋势与图表，保证 7 个点） */
export interface MeditationReportStatisticsBucket {
  index: number;
  label: string;
  rangeStart: string;
  rangeEnd: string;
  totalDurationMinutes: number;
  sessionCount: number;
  avgHeartRate: number;
  avgBreathRate: number;
  movementCount: number;
}

export interface MeditationReportStatisticsResponse {
  range: string;
  /** 固定为 7：日/周/月图表与 trend 均为 7 个时间桶 */
  bucketCount: number;
  currentPeriod: MeditationCurrentPeriodStats;
  previousPeriod: MeditationPeriodStats;
  latestSessionMinutes: number;
  last7SessionsTotalMinutes: number;
  last7Sessions: any[];
  /** 当前周期 7 段时间桶（含 rangeStart/rangeEnd） */
  trend: MeditationReportStatisticsBucket[];
  durationChartData: {
    categories: string[];
    series: {
      name: string;
      data: number[];
    }[];
  };
  /** 四组折线图数据：心率 / 呼吸率 / 体动 / 时长；每组 2 条线（上一周期、当前周期），与 categories 对齐 */
  compareChartData: {
    categories: string[];
    heartRate: MeditationCompareChartBlock;
    breathRate: MeditationCompareChartBlock;
    movement: MeditationCompareChartBlock;
    duration: MeditationCompareChartBlock;
  };
}

/** 单个对比折线图：固定 2 条 series（上一周期、当前周期） */
export interface MeditationCompareChartBlock {
  series: {
    name: string;
    data: number[];
  }[];
}
