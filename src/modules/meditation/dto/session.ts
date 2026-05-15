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
   * 设备序列号；设备冥想（type=1）时可省略，后端使用当前用户 **sortOrder 最小** 的已绑定设备
   */
  @Rule(RuleType.string().optional().allow('', null))
  sn?: string | null;

  /**
   * 目标时长（分钟）
   * @example 20
   */
  @Rule(RuleType.number().required())
  targetDuration: number;

  /**
   * 冥想类型：1 设备冥想，2 无设备冥想；不传时：有 sn 则设备冥想，否则无设备
   */
  @Rule(RuleType.number().optional().valid(1, 2))
  type?: number;

  /**
   * 多人共修活动 ID（可选）。传入时服务端校验：场次进行中、在锁定名单、当前在计划窗±宽限内；通过后与普通开始冥想相同，禅修时长仍写入 session/report。
   */
  @Rule(RuleType.number().optional())
  activityId?: number;
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
  /** 分页页码，≥1；不传或与 size 均不传/为 0 则返回全量列表 */
  @Rule(RuleType.number().integer().min(1).optional())
  page?: number;

  /** 每页条数 1～100；不传则分页时默认 20 */
  @Rule(RuleType.number().integer().min(1).max(100).optional())
  size?: number;
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
