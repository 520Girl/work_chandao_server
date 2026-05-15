import { Rule, RuleType } from '@midwayjs/validate';

/**
 * 活动分页（与 /app/post/feed/teams 一致：可选 teamId 仅看该团队；不传则全局 + 可访问全部团队）
 */
export class ActivityAppPageQueryDTO {
  @Rule(RuleType.number().default(1))
  page?: number;

  @Rule(RuleType.number().default(20))
  size?: number;

  /**
   * 指定团队 ID：仅返回该团队下已发布活动；须为当前用户可访问团队（成员表 + firstTeamId 兜底），否则报错。
   * 不传：全局活动 + 用户可访问各团队活动。
   */
  @Rule(RuleType.number().optional())
  teamId?: number;

  /**
   * 传 `1` 时同时返回已过期活动（`endDate` 早于当前时间）；默认 `0` 仅未结束或结束时间为空的活动。
   */
  @Rule(RuleType.number().valid(0, 1).optional())
  includeExpired?: number;
}

/**
 * 参加活动请求
 * @example
 * {
 *   "id": 1
 * }
 */
export class ActivityJoinDTO {
  /**
   * 活动ID
   * @example 1
   */
  @Rule(RuleType.number().required())
  id: number;
}

/**
 * 团队负责人：从模板创建本团队活动（小程序）
 */
export class AppActivityCreateFromTemplateDTO {
  @Rule(RuleType.number().required().integer().min(1))
  teamId: number;

  @Rule(RuleType.number().required().integer().min(1))
  templateId: number;

  @Rule(RuleType.string().required().max(200))
  title: string;

  /** ISO 日期或日期时间；发布 status=2 时必填 */
  @Rule(RuleType.string().optional().allow(''))
  startDate?: string;

  @Rule(RuleType.string().optional().allow(''))
  endDate?: string;

  /** 不传则用模板 description */
  @Rule(RuleType.string().optional().allow(''))
  content?: string;

  /** 1 草稿 2 发布（默认 2）；请传数字，勿传字符串避免被误判为草稿 */
  @Rule(RuleType.number().valid(1, 2).optional())
  status?: number;

  /**
   * 1 每日打卡 2 仅一次（普通活动；默认回落模板）
   * **activityType=2（多人共修）时后端会强制为 2（仅一次语义）**，与是否传本字段无关
   */
  @Rule(RuleType.number().valid(1, 2).optional())
  checkinMode?: number;

  @Rule(RuleType.number().integer().min(0).optional())
  targetMeditationSeconds?: number;

  @Rule(RuleType.number().integer().min(0).max(100).optional())
  passPercent?: number;

  /** 1 普通打卡 2 多人共修 */
  @Rule(RuleType.number().valid(1, 2).optional())
  activityType?: number;

  /** 共修配置：maxParticipants、scheduledStartTime、scheduledEndTime、roomNo、rankGraceSeconds(0-300 榜单边界秒，缺省 30) */
  @Rule(RuleType.object().optional())
  sessionConfig?: Record<string, any>;
}

export class ActivityCheckinDTO {
  @Rule(RuleType.number().required())
  id: number;

  @Rule(RuleType.number())
  lat?: number;

  @Rule(RuleType.number())
  lng?: number;

  @Rule(RuleType.number())
  accuracy?: number;

  @Rule(RuleType.string())
  province?: string;

  @Rule(RuleType.string())
  city?: string;
}

export class ActivityRoomReadyDTO {
  @Rule(RuleType.number().required())
  id: number;

  @Rule(RuleType.number().valid(0, 1).required())
  ready: number;
}

export class ActivityRoomIdDTO {
  @Rule(RuleType.number().required())
  id: number;
}
