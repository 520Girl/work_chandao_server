INSERT INTO base_sys_param
(`createTime`, `updateTime`, `name`, `keyName`, `data`, `dataType`, `remark`, `tenantId`)
SELECT
  DATE_FORMAT(NOW(), '%Y-%m-%d %H:%i:%s'),
  DATE_FORMAT(NOW(), '%Y-%m-%d %H:%i:%s'),
  '排行榜计分权重',
  'LEADERBOARD_SCORE_WEIGHTS',
  '{"w_like_ln":5,"w_post":2,"w_checkin":10,"w_report_device":8,"w_report_nodevice":2,"w_min_device":1,"w_min_nodevice":0.3,"cap_min_device":600,"cap_min_nodevice":120}',
  0,
  '综合排行榜权重配置；无设备冥想可降低权重',
  NULL
WHERE NOT EXISTS (
  SELECT 1 FROM base_sys_param WHERE keyName='LEADERBOARD_SCORE_WEIGHTS'
);

