INSERT INTO base_sys_param
(`createTime`, `updateTime`, `name`, `keyName`, `data`, `dataType`, `remark`, `tenantId`)
SELECT
  DATE_FORMAT(NOW(), '%Y-%m-%d %H:%i:%s'),
  DATE_FORMAT(NOW(), '%Y-%m-%d %H:%i:%s'),
  '冥想实时数据单次最大落库条数',
  'MEDITATION_REALTIME_MAX_SAVE_PER_POLL',
  '5',
  1,
  '设备冥想轮询 /app/meditation/poll 每次最多落库多少条生理样本（批内先按 recordTimestamp 去重）',
  NULL
WHERE NOT EXISTS (
  SELECT 1 FROM base_sys_param WHERE keyName='MEDITATION_REALTIME_MAX_SAVE_PER_POLL'
);

