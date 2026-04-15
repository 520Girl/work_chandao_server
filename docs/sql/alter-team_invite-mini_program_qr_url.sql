-- 团队邀请：存储生成的小程序码图片 URL，供后台列表/详情展示
ALTER TABLE `team_invite`
  ADD COLUMN `miniProgramQrUrl` varchar(1024) NULL COMMENT '邀请小程序码图片URL' AFTER `joinedUserId`;
