SET @colExists := (
  SELECT COUNT(1)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'activity_info'
    AND COLUMN_NAME = 'checkinMode'
);
SET @ddl := IF(
  @colExists = 0,
  'ALTER TABLE `activity_info` ADD COLUMN `checkinMode` TINYINT NOT NULL DEFAULT 1 COMMENT ''打卡模式：1每日打卡 2仅一次''',
  'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

INSERT INTO `message_template` (`keyName`, `name`, `titleTpl`, `contentTpl`, `contentType`, `contentDataTpl`, `enabled`, `createTime`, `updateTime`)
VALUES (
  'ACTIVITY_CHECKIN_REMINDER',
  '活动打卡提醒',
  '今日活动未打卡提醒',
  '今日活动「{{title}}」尚未打卡，请及时完成~',
  0,
  JSON_OBJECT('activityId', '{{activityId}}', 'teamId', '{{teamId}}', 'action', 'checkin'),
  1,
  NOW(),
  NOW()
)
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `titleTpl` = VALUES(`titleTpl`),
  `contentTpl` = VALUES(`contentTpl`),
  `contentType` = VALUES(`contentType`),
  `contentDataTpl` = VALUES(`contentDataTpl`),
  `enabled` = VALUES(`enabled`);

INSERT INTO `dict_type` (`name`, `key`, `createTime`, `updateTime`, `tenantId`)
SELECT '消息业务类型', 'message_biz_type', NOW(), NOW(), NULL
WHERE NOT EXISTS (
  SELECT 1 FROM `dict_type` WHERE `key` = 'message_biz_type' LIMIT 1
);

SET @typeId := (SELECT id FROM `dict_type` WHERE `key` = 'message_biz_type' ORDER BY id DESC LIMIT 1);

INSERT INTO `dict_info` (`typeId`, `name`, `value`, `orderNum`, `remark`, `parentId`, `type`, `createTime`, `updateTime`, `tenantId`)
SELECT @typeId, '活动打卡提醒', 'activity_checkin_reminder', 30, '每日 9 点检查未打卡成员并发送提醒', NULL, NULL, NOW(), NOW(), NULL
WHERE NOT EXISTS (
  SELECT 1 FROM `dict_info`
  WHERE `typeId` = @typeId AND `value` = 'activity_checkin_reminder'
  LIMIT 1
);
