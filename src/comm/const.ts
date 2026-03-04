
/**
 * 用户角色
 */
export enum UserRole {
  UNKNOWN = 0, // 未知
  MEMBER = 1, // 成员
  GROUP_LEADER = 2, // 组长 (管理 >= 3人)
  CAMP_ADMIN = 3, // 营长 (>= 11人)
  TEAM_ADMIN = 4, // 团长 (>= 101人)
  SUPER_ADMIN = 5, // 超管
}

/**
 * 团队类型
 */
export enum TeamType {
  UNKNOWN = 0,
  GROUP = 1, // 小组
  CAMP = 2, // 营级
  TEAM = 3, // 团级
}
