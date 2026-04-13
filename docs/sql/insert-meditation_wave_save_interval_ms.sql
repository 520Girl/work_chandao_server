INSERT INTO base_sys_param
(`createTime`, `updateTime`, `name`, `keyName`, `data`, `dataType`, `remark`, `tenantId`)
SELECT
  DATE_FORMAT(NOW(), '%Y-%m-%d %H:%i:%s'),
  DATE_FORMAT(NOW(), '%Y-%m-%d %H:%i:%s'),
  '冥想波形存储间隔(毫秒)',
  'MEDITATION_WAVE_SAVE_INTERVAL_MS',
  '10000',
  1,
  '冥想实时数据落库时 waveBlob 的稀疏存储间隔；数值越小存储越多',
  NULL
WHERE NOT EXISTS (
  SELECT 1 FROM base_sys_param WHERE keyName='MEDITATION_WAVE_SAVE_INTERVAL_MS'
);

