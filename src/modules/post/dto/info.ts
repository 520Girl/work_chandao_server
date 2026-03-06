import { Rule, RuleType } from '@midwayjs/validate';

/**
 * 分享报告请求
 * @example
 * {
 *   "reportId": 1,
 *   "targetTeamId": 2,  // 可选，提交到其他社群时传入，需审核
 *   "content": "今天的冥想分享" // 可选，自定义文案
 * }
 */
export class PostShareDTO {
  /**
   * 冥想报告ID
   * @example 1
   */
  @Rule(RuleType.number().required())
  reportId: number;

  /**
   * 自定义分享内容（可选），为空则使用默认文案
   * @example "今天的冥想分享"
   */
  @Rule(RuleType.string().optional().allow(''))
  content?: string;

  /**
   * 目标团队ID（可选），提交到其他社群时传入，需管理员审核
   * @example 2
   */
  @Rule(RuleType.number().optional().allow(null))
  targetTeamId?: number | null;
}

/**
 * 手动发布动态请求
 * @example
 * {
 *   "content": "今天的冥想分享",
 *   "images": ["https://example.com/image1.jpg"],
 *   "teamId": 2  // 可选，指定发布到的团队，不传则使用首团队；为空表示全局动态
 * }
 */
export class PostManualDTO {
  /**
   * 动态内容
   * @example "今天的冥想分享"
   */
  @Rule(RuleType.string().required())
  content: string;

  /**
   * 图片数组（可选）
   * @example ["https://example.com/image1.jpg"]
   */
  @Rule(RuleType.array())
  images?: string[];

  /**
   * 团队ID（可选），指定发布到的团队；为空表示全局动态
   * @example 2
   */
  @Rule(RuleType.number().optional().allow(null))
  teamId?: number | null;
}

/**
 * 编辑动态请求
 * @example
 * {
 *   "id": 1,
 *   "content": "更新的内容",
 *   "images": ["https://example.com/image2.jpg"]
 * }
 */
export class PostUpdateDTO {
  /**
   * 动态ID
   * @example 1
   */
  @Rule(RuleType.number().required())
  id: number;

  /**
   * 动态内容
   * @example "更新的内容"
   */
  @Rule(RuleType.string().required())
  content: string;

  /**
   * 图片数组（可选）
   * @example ["https://example.com/image2.jpg"]
   */
  @Rule(RuleType.array())
  images?: string[];
}

/**
 * 点赞请求
 * @example
 * {
 *   "id": 1
 * }
 */
export class PostLikeDTO {
  /**
   * 动态ID
   * @example 1
   */
  @Rule(RuleType.number().required())
  id: number;
}
