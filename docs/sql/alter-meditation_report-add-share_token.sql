-- 冥想报告分享：免登录查看用令牌
ALTER TABLE `meditation_report`
  ADD COLUMN `shareToken` varchar(64) NULL COMMENT '分享令牌（免登录查看）' AFTER `achievements`,
  ADD UNIQUE INDEX `uk_meditation_report_share_token` (`shareToken`);
