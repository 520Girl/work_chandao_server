ALTER TABLE `activity_info`
  ADD COLUMN `targetMeditationSeconds` INT NOT NULL DEFAULT 0 COMMENT '禅修目标时长(秒)' AFTER `content`,
  ADD COLUMN `passPercent` INT NOT NULL DEFAULT 100 COMMENT '达标百分比(0-100)' AFTER `targetMeditationSeconds`;

ALTER TABLE `activity_checkin_log`
  ADD COLUMN `source` TINYINT NOT NULL DEFAULT 1 COMMENT '来源 1手动 2自动' AFTER `result`;
