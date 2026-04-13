ALTER TABLE meditation_data
  ADD COLUMN rightHeartRate INT NOT NULL DEFAULT 0 COMMENT '右侧心率' AFTER breathRate,
  ADD COLUMN rightBreathRate DOUBLE NOT NULL DEFAULT 0 COMMENT '右侧呼吸率' AFTER rightHeartRate,
  ADD COLUMN temperature DOUBLE NOT NULL DEFAULT 0 COMMENT '室内温度' AFTER rightBreathRate,
  ADD COLUMN humidity DOUBLE NOT NULL DEFAULT 0 COMMENT '相对湿度' AFTER temperature;

ALTER TABLE meditation_data
  MODIFY COLUMN breathRate DOUBLE NOT NULL DEFAULT 0 COMMENT '呼吸率';

ALTER TABLE meditation_data
  ADD UNIQUE KEY uk_session_timestamp (sessionId, recordTimestamp);
