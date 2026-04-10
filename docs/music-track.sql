CREATE TABLE IF NOT EXISTS `music_track` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `createTime` varchar(255) NOT NULL COMMENT '创建时间',
  `updateTime` varchar(255) NOT NULL COMMENT '更新时间',
  `tenantId` int DEFAULT NULL COMMENT '租户ID',
  `title` varchar(255) NOT NULL COMMENT '标题',
  `audioUrl` varchar(1024) NOT NULL COMMENT '音频URL',
  `coverUrl` varchar(1024) DEFAULT NULL COMMENT '封面URL',
  `durationSeconds` int NOT NULL DEFAULT 0 COMMENT '时长(秒)',
  `sort` int NOT NULL DEFAULT 0 COMMENT '排序(越大越靠前)',
  `enabled` tinyint NOT NULL DEFAULT 1 COMMENT '是否启用 0否 1是',
  PRIMARY KEY (`id`),
  KEY `IDX_music_track_audioUrl` (`audioUrl`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='音乐曲目';

