-- 活动模板：是否允许团队负责人在小程序从该模板发起本团队活动
ALTER TABLE `activity_template`
  ADD COLUMN `allowTeamPublish` tinyint NOT NULL DEFAULT 1 COMMENT '团队负责人可小程序发布(0否1是)' AFTER `icon`;
