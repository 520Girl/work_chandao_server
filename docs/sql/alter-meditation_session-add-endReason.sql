ALTER TABLE meditation_session
  ADD COLUMN endReason INT NULL COMMENT '结束原因' AFTER lastActiveTime;
