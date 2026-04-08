CREATE TABLE IF NOT EXISTS `team_invite_join` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `createTime` varchar(32) NOT NULL COMMENT '创建时间',
  `updateTime` varchar(32) NOT NULL COMMENT '更新时间',
  `tenantId` int DEFAULT NULL COMMENT '租户ID',
  `inviteId` int NOT NULL COMMENT '邀请ID',
  `userId` int NOT NULL COMMENT '加入用户ID',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_invite_user` (`inviteId`, `userId`),
  KEY `idx_inviteId` (`inviteId`),
  KEY `idx_userId` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='团队邀请链接加入记录';

