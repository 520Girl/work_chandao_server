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
 *   "isTop": true
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
   * 是否置顶
   * @example true
   */
  @Rule(RuleType.boolean())
  isTop?: boolean;
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
 *   "isTop": false
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
   * 是否置顶
   * @example false
   */
  @Rule(RuleType.boolean())
  isTop?: boolean;
}
