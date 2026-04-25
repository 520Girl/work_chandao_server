import { Rule, RuleType } from '@midwayjs/validate';

/**
 * 通过邀请码加入团队
 * @example
 * { "code": "a1b2c3d4e5f6" }
 */
export class UserJoinByInviteDTO {
  /**
   * 邀请码
   */
  @Rule(RuleType.string().required())
  code: string;
}

/**
 * 退出团队
 * @example
 * { "teamId": 1 }
 */
export class UserQuitTeamDTO {
  @Rule(RuleType.number().required())
  teamId: number;
}

/** 负责人创建「加入已有团队」邀请 */
export class UserCreateTeamInviteDTO {
  @Rule(RuleType.number().required())
  teamId: number;

  @Rule(RuleType.number().optional().default(7).min(1).max(365))
  days?: number;

  @Rule(RuleType.number().optional().allow(null))
  bindUserId?: number | null;
}

/** 我的团队列表自定义排序：teamIds 顺序即展示顺序（须均为当前在职团队） */
export class UserReorderTeamsDTO {
  @Rule(
    RuleType.array()
      .items(RuleType.number().required())
      .required()
      .min(1)
  )
  teamIds: number[];
}

/** 创建「个人成团」邀请（发起人为当前用户） */
export class UserCreatePersonalInviteDTO {
  @Rule(RuleType.number().optional().default(7).min(1).max(365))
  days?: number;

  @Rule(RuleType.number().optional().allow(null))
  bindUserId?: number | null;
}
