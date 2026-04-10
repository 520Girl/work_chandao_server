CREATE TABLE IF NOT EXISTS `activity_checkin_log` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `userId` BIGINT NOT NULL COMMENT '用户ID',
  `activityId` BIGINT NOT NULL COMMENT '活动ID',
  `checkinTime` DATETIME NULL COMMENT '签到时间',
  `lat` DECIMAL(10,6) NULL COMMENT '纬度',
  `lng` DECIMAL(10,6) NULL COMMENT '经度',
  `accuracy` INT NULL COMMENT '定位精度(米)',
  `distanceM` INT NULL COMMENT '距离(米)',
  `result` TINYINT NOT NULL DEFAULT 1 COMMENT '签到结果 0失败 1成功',
  `reason` VARCHAR(255) NULL COMMENT '失败原因',
  `ip` VARCHAR(64) NULL COMMENT 'IP',
  `ua` TEXT NULL COMMENT 'User-Agent',
  `province` VARCHAR(50) NULL COMMENT '省份(展示用)',
  `city` VARCHAR(50) NULL COMMENT '城市(展示用)',
  `createTime` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updateTime` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `tenantId` BIGINT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_acl_user` (`userId`),
  KEY `idx_acl_activity` (`activityId`),
  KEY `idx_acl_activity_user` (`activityId`, `userId`),
  KEY `idx_acl_time` (`checkinTime`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='活动签到明细';

SET @uColExists := (
  SELECT COUNT(1)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'user_info'
    AND COLUMN_NAME = 'lastProvince'
);
SET @uDdl := IF(
  @uColExists = 0,
  'ALTER TABLE `user_info`
    ADD COLUMN `lastProvince` VARCHAR(50) NULL COMMENT ''最近省份(展示用)'',
    ADD COLUMN `lastCity` VARCHAR(50) NULL COMMENT ''最近城市(展示用)'',
    ADD COLUMN `lastLocationTime` DATETIME NULL COMMENT ''最近位置更新时间''',
  'SELECT 1'
);
PREPARE stmt2 FROM @uDdl;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;
