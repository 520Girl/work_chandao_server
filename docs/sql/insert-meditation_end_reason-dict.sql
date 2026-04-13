INSERT INTO `dict_type` (`name`, `key`, `createTime`, `updateTime`, `tenantId`)
SELECT '冥想结束原因', 'meditation_end_reason', NOW(), NOW(), NULL
WHERE NOT EXISTS (
  SELECT 1 FROM `dict_type` WHERE `key` = 'meditation_end_reason' LIMIT 1
);

SET @typeId := (
  SELECT id FROM `dict_type` WHERE `key` = 'meditation_end_reason' ORDER BY id DESC LIMIT 1
);

INSERT INTO `dict_info` (`typeId`, `name`, `value`, `orderNum`, `remark`, `parentId`, `type`, `createTime`, `updateTime`, `tenantId`)
SELECT @typeId, '手动结束', '1', 1, NULL, NULL, NULL, NOW(), NOW(), NULL
WHERE NOT EXISTS (
  SELECT 1 FROM `dict_info` WHERE `typeId` = @typeId AND `value` = '1' LIMIT 1
);

INSERT INTO `dict_info` (`typeId`, `name`, `value`, `orderNum`, `remark`, `parentId`, `type`, `createTime`, `updateTime`, `tenantId`)
SELECT @typeId, '超时结束', '2', 2, NULL, NULL, NULL, NOW(), NOW(), NULL
WHERE NOT EXISTS (
  SELECT 1 FROM `dict_info` WHERE `typeId` = @typeId AND `value` = '2' LIMIT 1
);

INSERT INTO `dict_info` (`typeId`, `name`, `value`, `orderNum`, `remark`, `parentId`, `type`, `createTime`, `updateTime`, `tenantId`)
SELECT @typeId, '到时结束', '3', 3, NULL, NULL, NULL, NOW(), NOW(), NULL
WHERE NOT EXISTS (
  SELECT 1 FROM `dict_info` WHERE `typeId` = @typeId AND `value` = '3' LIMIT 1
);

INSERT INTO `dict_info` (`typeId`, `name`, `value`, `orderNum`, `remark`, `parentId`, `type`, `createTime`, `updateTime`, `tenantId`)
SELECT @typeId, '短时结束', '4', 4, NULL, NULL, NULL, NOW(), NOW(), NULL
WHERE NOT EXISTS (
  SELECT 1 FROM `dict_info` WHERE `typeId` = @typeId AND `value` = '4' LIMIT 1
);
