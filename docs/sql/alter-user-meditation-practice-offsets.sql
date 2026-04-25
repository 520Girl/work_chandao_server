-- 用户冥想累计：后台可配置的补偿值（与站内会话/报告汇总相加，用于迁移或纠错）
-- 执行前请备份。

ALTER TABLE `user_info`
  ADD COLUMN `meditationExtraSeconds` int UNSIGNED NOT NULL DEFAULT 0 COMMENT '冥想累计时长补偿(秒)，与站内报告 totalDuration 之和' AFTER `lastLocationTime`,
  ADD COLUMN `meditationExtraDays` int NOT NULL DEFAULT 0 COMMENT '冥想累计有练习天数补偿(天)，与站内已完成会话去重日期数之和' AFTER `meditationExtraSeconds`;
