import { Rule, RuleType } from '@midwayjs/validate';

/**
 * 分享报告请求
 * @example
 * {
 *   "reportId": 1
 * }
 */
export class PostShareDTO {
  /**
   * 冥想报告ID
   * @example 1
   */
  @Rule(RuleType.number().required())
  reportId: number;
}

/**
 * 手动发布动态请求
 * @example
 * {
 *   "content": "今天的冥想分享",
 *   "images": ["https://example.com/image1.jpg"]
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
