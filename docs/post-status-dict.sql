INSERT INTO `dict_type` (`name`, `key`, `createTime`, `updateTime`, `tenantId`)
SELECT '动态状态', 'post_status', NOW(), NOW(), NULL
WHERE NOT EXISTS (
  SELECT 1 FROM `dict_type` WHERE `key` = 'post_status' LIMIT 1
);

SET @typeId := (SELECT id FROM `dict_type` WHERE `key` = 'post_status' ORDER BY id DESC LIMIT 1);

INSERT INTO `dict_info` (`typeId`, `name`, `value`, `orderNum`, `remark`, `parentId`, `type`, `createTime`, `updateTime`, `tenantId`)
SELECT @typeId, '未知', '0', 0, NULL, NULL, NULL, NOW(), NOW(), NULL
WHERE NOT EXISTS (
  SELECT 1 FROM `dict_info` WHERE `typeId` = @typeId AND `value` = '0' LIMIT 1
);

INSERT INTO `dict_info` (`typeId`, `name`, `value`, `orderNum`, `remark`, `parentId`, `type`, `createTime`, `updateTime`, `tenantId`)
SELECT @typeId, '待审核', '1', 1, NULL, NULL, NULL, NOW(), NOW(), NULL
WHERE NOT EXISTS (
  SELECT 1 FROM `dict_info` WHERE `typeId` = @typeId AND `value` = '1' LIMIT 1
);

INSERT INTO `dict_info` (`typeId`, `name`, `value`, `orderNum`, `remark`, `parentId`, `type`, `createTime`, `updateTime`, `tenantId`)
SELECT @typeId, '已发布', '2', 2, NULL, NULL, NULL, NOW(), NOW(), NULL
WHERE NOT EXISTS (
  SELECT 1 FROM `dict_info` WHERE `typeId` = @typeId AND `value` = '2' LIMIT 1
);

INSERT INTO `dict_info` (`typeId`, `name`, `value`, `orderNum`, `remark`, `parentId`, `type`, `createTime`, `updateTime`, `tenantId`)
SELECT @typeId, '拒绝', '3', 3, NULL, NULL, NULL, NOW(), NOW(), NULL
WHERE NOT EXISTS (
  SELECT 1 FROM `dict_info` WHERE `typeId` = @typeId AND `value` = '3' LIMIT 1
);
