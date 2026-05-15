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
SELECT @typeId, '无设备超时结束', '4', 4,
  '与=2同属「长时间无活动」触发的自动结束。代码：超时分支且（开始→lastActiveTime）时长 < MEDITATION_AUTO_END_TIMEOUT_MIN 记为4。典型为设备会话从未刷新 lastActive（无坐姿/无数据）；亦含开始后很快失联。',
  NULL, NULL, NOW(), NOW(), NULL
WHERE NOT EXISTS (
  SELECT 1 FROM `dict_info` WHERE `typeId` = @typeId AND `value` = '4' LIMIT 1
);

-- 已存在旧数据（如曾用「短时结束」）时，同步展示名与备注
UPDATE `dict_info` i
INNER JOIN `dict_type` t ON t.`id` = i.`typeId` AND t.`key` = 'meditation_end_reason'
SET i.`name` = '无设备超时结束',
    i.`remark` = '与=2同属「长时间无活动」触发的自动结束。代码：超时分支且（开始→lastActiveTime）时长 < MEDITATION_AUTO_END_TIMEOUT_MIN 记为4。典型为设备会话从未刷新 lastActive（无坐姿/无数据）；亦含开始后很快失联。'
WHERE i.`value` = '4';
