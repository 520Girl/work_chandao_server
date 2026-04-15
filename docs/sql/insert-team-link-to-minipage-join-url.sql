-- 小程序扫码落地页路径（不要前导 /），与微信 getwxacodeunlimit 的 page 一致；未配置时回退 module.team.inviteMiniPage
INSERT INTO base_sys_param
(`createTime`, `updateTime`, `name`, `keyName`, `data`, `dataType`, `remark`, `tenantId`)
SELECT
  DATE_FORMAT(NOW(), '%Y-%m-%d %H:%i:%s'),
  DATE_FORMAT(NOW(), '%Y-%m-%d %H:%i:%s'),
  '团队邀请小程序落地页路径',
  'TEAM_LINK_TO_MINIPAGE_JOIN_URL',
  'pages/team/invite',
  1,
  '团队邀请无限小程序码使用的 page，须与小程序 app.json 页面一致并在公众平台配置扫码规则',
  NULL
WHERE NOT EXISTS (
  SELECT 1 FROM base_sys_param WHERE keyName='TEAM_LINK_TO_MINIPAGE_JOIN_URL'
);
