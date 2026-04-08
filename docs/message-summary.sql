-- 1. 添加消息模板：社群动态点赞总结
INSERT INTO `message_template` (`keyName`, `name`, `titleTpl`, `contentTpl`, `contentType`, `contentDataTpl`, `enabled`, `createTime`, `updateTime`) VALUES
('POST_LIKE_SUMMARY', '动态点赞总结', '动态点赞总结', '您在 {{date}} 期间共有 {{count}} 位用户给您的动态点赞，继续加油哦！', 0, NULL, 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `titleTpl` = VALUES(`titleTpl`), `contentTpl` = VALUES(`contentTpl`);

-- 2. 添加字典：消息业务类型（本项目字典表为 dict_type / dict_info）
-- 2.1 确保字典类型存在：message_biz_type
INSERT INTO `dict_type` (`name`, `key`, `createTime`, `updateTime`, `tenantId`)
SELECT '消息业务类型', 'message_biz_type', NOW(), NOW(), NULL
WHERE NOT EXISTS (
  SELECT 1 FROM `dict_type` WHERE `key` = 'message_biz_type' LIMIT 1
);

-- 2.2 获取 typeId
SET @typeId := (SELECT id FROM `dict_type` WHERE `key` = 'message_biz_type' ORDER BY id DESC LIMIT 1);

-- 2.3 插入具体的字典项：动态点赞总结 -> post_like_summary
INSERT INTO `dict_info` (`typeId`, `name`, `value`, `orderNum`, `remark`, `parentId`, `type`, `createTime`, `updateTime`, `tenantId`)
SELECT @typeId, '动态点赞总结', 'post_like_summary', 1, '每天8点汇总昨日点赞情况', NULL, NULL, NOW(), NOW(), NULL
WHERE NOT EXISTS (
  SELECT 1 FROM `dict_info`
  WHERE `typeId` = @typeId AND `value` = 'post_like_summary'
  LIMIT 1
);
