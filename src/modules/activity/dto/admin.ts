import { Rule, RuleType } from '@midwayjs/validate';

/**
 * 创建活动请求
 * @example
 * {
 *   "templateId": 1,
 *   "title": "心灵瑜伽课堂",
 *   "startDate": "2026-03-01",
 *   "endDate": "2026-03-31",
 *   "content": "探索内心平静的瑜伽课程",
 *   "isTop": 1
 * }
 */
export class ActivityCreateDTO {
  /**
   * 模板ID
   * @example 1
   */
  @Rule(RuleType.number().required())
  templateId: number;

  /**
   * 活动标题
   * @example "心灵瑜伽课堂"
   */
  @Rule(RuleType.string().required())
  title: string;

  /**
   * 开始日期（ISO8601格式）
   * @example "2026-03-01"
   */
  @Rule(RuleType.string())
  startDate?: string;

  /**
   * 结束日期（ISO8601格式）
   * @example "2026-03-31"
   */
  @Rule(RuleType.string())
  endDate?: string;

  /**
   * 活动内容说明
   * @example "探索内心平静的瑜伽课程"
   */
  @Rule(RuleType.string())
  content?: string;

  /**
   * 是否置顶（0 否 1 是）
   * @example 1
   */
  @Rule(RuleType.number().valid(0, 1))
  isTop?: number;

  /**
   * 状态 1草稿 2发布
   * @example 1
   */
  @Rule(RuleType.number())
  status?: number;

  /**
   * 团队ID，null 为全局活动
   * @example 1
   */
  @Rule(RuleType.number().optional())
  teamId?: number | null;
}

/**
 * 编辑活动请求
 * @example
 * {
 *   "id": 1,
 *   "templateId": 1,
 *   "title": "更新的活动标题",
 *   "startDate": "2026-03-01",
 *   "endDate": "2026-03-31",
 *   "content": "更新的内容",
 *   "isTop": 0
 * }
 */
export class ActivityUpdateDTO {
  /**
   * 活动ID
   * @example 1
   */
  @Rule(RuleType.number().required())
  id: number;

  /**
   * 模板ID
   * @example 1
   */
  @Rule(RuleType.number())
  templateId?: number;

  /**
   * 活动标题
   * @example "更新的活动标题"
   */
  @Rule(RuleType.string())
  title?: string;

  /**
   * 开始日期
   * @example "2026-03-01"
   */
  @Rule(RuleType.string())
  startDate?: string;

  /**
   * 结束日期
   * @example "2026-03-31"
   */
  @Rule(RuleType.string())
  endDate?: string;

  /**
   * 活动内容
   * @example "更新的内容"
   */
  @Rule(RuleType.string())
  content?: string;

  /**
   * 是否置顶（0 否 1 是）
   * @example 0
   */
  @Rule(RuleType.number().valid(0, 1))
  isTop?: number;

  /**
   * 状态 1草稿 2发布
   * @example 1
   */
  @Rule(RuleType.number().valid(1, 2))
  status?: number;

  /**
   * 发布人ID 系统用户ID
   * @example 1
   */
  @Rule(RuleType.number())
  authorId?: number;

  /**
   * 团队ID，null 为全局活动（仅发布且未过期活动可分配）
   * @example 1
   */
  @Rule(RuleType.number().optional())
  teamId?: number | null;

  /**
   * 租户ID（仅接受前端回传，不参与更新）
   */
  @Rule(RuleType.number().optional())
  tenantId?: number;
}

/**
 * 分配活动团队请求
 * @example
 * {
 *   "id": 1,
 *   "teamId": 2
 * }
 */
export class ActivityAssignTeamDTO {
  /**
   * 活动ID
   * @example 1
   */
  @Rule(RuleType.number().required())
  id: number;

  /**
   * 团队ID，null 表示全局活动
   * @example 2
   */
  @Rule(RuleType.number().allow(null))
  teamId?: number | null;
}
