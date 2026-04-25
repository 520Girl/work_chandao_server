-- App 端设备列表、团队列表自定义排序；数值越小越靠前；冥想/邀请等业务「主设备」取同用户下 sortOrder 最小的一条

ALTER TABLE `device_info`
  ADD COLUMN `sortOrder` int NOT NULL DEFAULT 0 COMMENT '用户内排序，越小越靠前' AFTER `bindTime`;

ALTER TABLE `team_member`
  ADD COLUMN `sortOrder` int NOT NULL DEFAULT 0 COMMENT '用户视角下团队排序，越小越靠前' AFTER `operatorId`;

-- 已有数据：按主键稳定排序，避免全为 0 时顺序不稳定（可按需改为按 bindTime）
UPDATE `device_info` SET `sortOrder` = `id` WHERE `userId` IS NOT NULL;
UPDATE `team_member` SET `sortOrder` = `id` WHERE `exitType` = 0;
