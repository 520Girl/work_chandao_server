-- post_info 增加用户状态字段（心境标签） + 字典初始化

-- 1) 增加字段：userState（若已存在则跳过）
SET @colExists := (
  SELECT COUNT(1)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'post_info'
    AND COLUMN_NAME = 'userState'
);
SET @ddl := IF(
  @colExists = 0,
  'ALTER TABLE `post_info` ADD COLUMN `userState` INT NOT NULL DEFAULT 1 COMMENT ''用户状态：1漂浮 2宁静 3消散 4觉察''',
  'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2) 字典类型：post_user_state
INSERT INTO `dict_type` (`name`, `key`, `createTime`, `updateTime`, `tenantId`)
SELECT '动态用户状态', 'post_user_state', NOW(), NOW(), NULL
WHERE NOT EXISTS (
  SELECT 1 FROM `dict_type` WHERE `key` = 'post_user_state' LIMIT 1
);

SET @typeId := (SELECT id FROM `dict_type` WHERE `key` = 'post_user_state' ORDER BY id DESC LIMIT 1);

-- 3) 字典项：1漂浮 2宁静 3消散 4觉察
INSERT INTO `dict_info` (`typeId`, `name`, `value`, `orderNum`, `remark`, `parentId`, `type`, `createTime`, `updateTime`, `tenantId`)
SELECT @typeId, '漂浮', '1', 1, NULL, NULL, NULL, NOW(), NOW(), NULL
WHERE NOT EXISTS (SELECT 1 FROM `dict_info` WHERE `typeId`=@typeId AND `value`='1' LIMIT 1);

INSERT INTO `dict_info` (`typeId`, `name`, `value`, `orderNum`, `remark`, `parentId`, `type`, `createTime`, `updateTime`, `tenantId`)
SELECT @typeId, '宁静', '2', 2, NULL, NULL, NULL, NOW(), NOW(), NULL
WHERE NOT EXISTS (SELECT 1 FROM `dict_info` WHERE `typeId`=@typeId AND `value`='2' LIMIT 1);

INSERT INTO `dict_info` (`typeId`, `name`, `value`, `orderNum`, `remark`, `parentId`, `type`, `createTime`, `updateTime`, `tenantId`)
SELECT @typeId, '消散', '3', 3, NULL, NULL, NULL, NOW(), NOW(), NULL
WHERE NOT EXISTS (SELECT 1 FROM `dict_info` WHERE `typeId`=@typeId AND `value`='3' LIMIT 1);

INSERT INTO `dict_info` (`typeId`, `name`, `value`, `orderNum`, `remark`, `parentId`, `type`, `createTime`, `updateTime`, `tenantId`)
SELECT @typeId, '觉察', '4', 4, NULL, NULL, NULL, NOW(), NOW(), NULL
WHERE NOT EXISTS (SELECT 1 FROM `dict_info` WHERE `typeId`=@typeId AND `value`='4' LIMIT 1);

