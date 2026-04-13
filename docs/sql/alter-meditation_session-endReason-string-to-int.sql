UPDATE meditation_session
SET endReason = CASE endReason
  WHEN 'manual' THEN 1
  WHEN 'timeout' THEN 2
  WHEN 'target' THEN 3
  ELSE NULL
END
WHERE endReason IS NOT NULL AND endReason NOT REGEXP '^[0-9]+$';

ALTER TABLE meditation_session
  MODIFY COLUMN endReason INT NULL COMMENT '结束原因';

