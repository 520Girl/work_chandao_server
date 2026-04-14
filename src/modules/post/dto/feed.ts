import { Rule, RuleType } from '@midwayjs/validate';

export class PostFeedQueryDTO {
  /**
   * 页码
   * @default 1
   * @example 1
   */
  @Rule(RuleType.number().default(1))
  page?: number;

  /**
   * 每页大小
   * @default 20
   * @example 20
   */
  @Rule(RuleType.number().default(20))
  size?: number;

  /**
   * 发布状态筛选：0全部（仅 1/2） 1未发布(待审核) 2已发布
   * @default 2
   * @example 2
   */
  @Rule(RuleType.number().valid(0, 1, 2).default(2))
  publishStatus?: number;

  /**
   * 指定团队 ID：仅返回本人发布且 `teamId` 为该团队的动态；不传则不限团队。
   * 须为当前用户可访问团队（与团队动态流一致），否则报错。
   */
  @Rule(RuleType.number().optional())
  teamId?: number;
}

/** 团队动态流查询 */
export class PostFeedTeamsQueryDTO {
  @Rule(RuleType.number().default(1))
  page?: number;

  @Rule(RuleType.number().default(20))
  size?: number;

  /**
   * 指定团队 ID：仅返回该团队下已发布动态；不传则当前用户所属全部团队（含 firstTeamId 兜底）
   */
  @Rule(RuleType.number().optional())
  teamId?: number;
}

