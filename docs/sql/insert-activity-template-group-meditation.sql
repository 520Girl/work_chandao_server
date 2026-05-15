-- 新增默认模板：多人共修
INSERT INTO `activity_template` (
  `name`,
  `description`,
  `icon`,
  `allowTeamPublish`,
  `activityTypeDefault`,
  `checkinModeDefault`,
  `targetMeditationSecondsDefault`,
  `passPercentDefault`,
  `sessionConfigDefault`,
  `createTime`,
  `updateTime`
)
SELECT
  '多人共修',
  '团队成员统一时间进入共修，活动结束后按时长/专注/稳定/综合排行。',
  NULL,
  1,
  2,
  1,
  0,
  100,
  JSON_OBJECT('startMode', 'scheduled', 'maxParticipants', 20, 'roomNo', NULL),
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM `activity_template` WHERE `name` = '多人共修'
);
