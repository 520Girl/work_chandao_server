-- 多人共修活动：活动表、报名表扩展（实时聚合报告，不新增结果表）
-- 执行前请备份

ALTER TABLE `activity_info`
  ADD COLUMN `activityType` tinyint NOT NULL DEFAULT 1 COMMENT '1普通打卡 2多人共修' AFTER `checkinMode`,
  ADD COLUMN `sessionConfig` json NULL COMMENT '共修配置' AFTER `activityType`,
  ADD COLUMN `groupSessionPhase` tinyint NOT NULL DEFAULT 0 COMMENT '0待开场1进行中2已结算' AFTER `sessionConfig`,
  ADD COLUMN `lockedRosterUserIds` json NULL COMMENT '开场锁定用户ID' AFTER `groupSessionPhase`;

ALTER TABLE `activity_participation`
  ADD COLUMN `readyStatus` tinyint NOT NULL DEFAULT 0 COMMENT '0未就绪1已就绪' AFTER `checkins`,
  ADD COLUMN `joinTime` datetime(6) NULL COMMENT '加入时间' AFTER `readyStatus`,
  ADD COLUMN `leaveTime` datetime(6) NULL COMMENT '退出时间' AFTER `joinTime`,
  ADD COLUMN `roomRole` tinyint NOT NULL DEFAULT 1 COMMENT '1成员2主持' AFTER `leaveTime`;

ALTER TABLE `activity_template`
  ADD COLUMN `activityTypeDefault` tinyint NOT NULL DEFAULT 1 COMMENT '默认活动类型 1普通打卡2多人共修' AFTER `allowTeamPublish`,
  ADD COLUMN `checkinModeDefault` tinyint NOT NULL DEFAULT 1 COMMENT '默认打卡模式 1每日2仅一次' AFTER `activityTypeDefault`,
  ADD COLUMN `targetMeditationSecondsDefault` int NOT NULL DEFAULT 0 COMMENT '默认禅修目标秒数' AFTER `checkinModeDefault`,
  ADD COLUMN `passPercentDefault` tinyint NOT NULL DEFAULT 100 COMMENT '默认达标百分比' AFTER `targetMeditationSecondsDefault`,
  ADD COLUMN `sessionConfigDefault` json NULL COMMENT '默认会话配置' AFTER `passPercentDefault`;
