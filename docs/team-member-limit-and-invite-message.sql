SET @colExists := (
  SELECT COUNT(1)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'team_info'
    AND COLUMN_NAME = 'maxMemberCount'
);
SET @ddl := IF(
  @colExists = 0,
  'ALTER TABLE `team_info` ADD COLUMN `maxMemberCount` INT NOT NULL DEFAULT 0 COMMENT ''成员上限（0表示不限制）''',
  'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

INSERT INTO `message_template` (`keyName`, `name`, `titleTpl`, `contentTpl`, `contentType`, `contentDataTpl`, `enabled`, `createTime`, `updateTime`)
VALUES (
  'TEAM_INVITE_JOINED',
  '邀请加入通知（团队负责人）',
  '新成员加入团队',
  '用户 {{userName}}（{{phone}}）通过邀请码 {{inviteCode}} 加入了团队「{{teamName}}」',
  0,
  NULL,
  1,
  NOW(),
  NOW()
)
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `titleTpl` = VALUES(`titleTpl`),
  `contentTpl` = VALUES(`contentTpl`),
  `contentType` = VALUES(`contentType`),
  `enabled` = VALUES(`enabled`);

INSERT INTO `dict_type` (`name`, `key`, `createTime`, `updateTime`, `tenantId`)
SELECT '消息业务类型', 'message_biz_type', NOW(), NOW(), NULL
WHERE NOT EXISTS (
  SELECT 1 FROM `dict_type` WHERE `key` = 'message_biz_type' LIMIT 1
);

SET @typeId := (SELECT id FROM `dict_type` WHERE `key` = 'message_biz_type' ORDER BY id DESC LIMIT 1);

INSERT INTO `dict_info` (`typeId`, `name`, `value`, `orderNum`, `remark`, `parentId`, `type`, `createTime`, `updateTime`, `tenantId`)
SELECT @typeId, '邀请码加入团队', 'team_invite_joined', 10, '用户通过邀请码加入团队后通知团队负责人', NULL, NULL, NOW(), NOW(), NULL
WHERE NOT EXISTS (
  SELECT 1 FROM `dict_info`
  WHERE `typeId` = @typeId AND `value` = 'team_invite_joined'
  LIMIT 1
);
