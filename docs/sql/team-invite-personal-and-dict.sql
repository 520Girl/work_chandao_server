-- 1) team_invite：个人成团邀请（teamId 可空）、发起人、指定人、App 创建人、邀请模式
ALTER TABLE `team_invite`
  MODIFY COLUMN `teamId` int NULL COMMENT '团队ID；个人成团未完成前为 NULL，成团后写入新团队ID';

ALTER TABLE `team_invite`
  ADD COLUMN `inviteMode` tinyint NOT NULL DEFAULT 0 COMMENT '0=加入已有团队 1=个人成团(dict:team_invite_mode)' AFTER `teamId`,
  ADD COLUMN `sponsorUserId` int NULL COMMENT '个人成团发起人 user_info.id（成团后为 ownerId）' AFTER `inviteMode`,
  ADD COLUMN `bindUserId` int NULL COMMENT '可选：仅该用户可使用本邀请' AFTER `sponsorUserId`,
  ADD COLUMN `creatorAppUserId` int NULL COMMENT 'App 端创建人 user_info.id；后台创建为 NULL' AFTER `creatorId`;

-- 若库中尚无 miniProgramQrUrl，可再执行 alter-team_invite-mini_program_qr_url.sql

-- 2) 字典：邀请模式（后台字典维护展示用）
INSERT INTO `dict_type` (`createTime`, `updateTime`, `name`, `key`)
SELECT NOW(), NOW(), '团队邀请模式', 'team_invite_mode'
WHERE NOT EXISTS (SELECT 1 FROM `dict_type` WHERE `key` = 'team_invite_mode');

INSERT INTO `dict_info` (`createTime`, `updateTime`, `typeId`, `name`, `value`, `orderNum`, `remark`)
SELECT NOW(), NOW(), t.id, '加入已有团队', '0', 1, 'inviteMode=0'
FROM `dict_type` t WHERE t.`key` = 'team_invite_mode'
AND NOT EXISTS (SELECT 1 FROM `dict_info` i JOIN `dict_type` t2 ON i.typeId=t2.id WHERE t2.`key`='team_invite_mode' AND i.`value`='0');

INSERT INTO `dict_info` (`createTime`, `updateTime`, `typeId`, `name`, `value`, `orderNum`, `remark`)
SELECT NOW(), NOW(), t.id, '个人成团', '1', 2, 'inviteMode=1'
FROM `dict_type` t WHERE t.`key` = 'team_invite_mode'
AND NOT EXISTS (SELECT 1 FROM `dict_info` i JOIN `dict_type` t2 ON i.typeId=t2.id WHERE t2.`key`='team_invite_mode' AND i.`value`='1');

-- 3) 字典：团队类型 / 负责人角色 / 成团人数阈值（name 为机器键，value 为数字）
INSERT INTO `dict_type` (`createTime`, `updateTime`, `name`, `key`)
SELECT NOW(), NOW(), '团队人数与成团阈值', 'team_threshold'
WHERE NOT EXISTS (SELECT 1 FROM `dict_type` WHERE `key` = 'team_threshold');

INSERT INTO `dict_info` (`createTime`, `updateTime`, `typeId`, `name`, `value`, `orderNum`, `remark`)
SELECT NOW(), NOW(), t.id, nm, vl, ord, rm
FROM `dict_type` t
JOIN (
  SELECT 'team_regiment_min' AS nm, '100' AS vl, 1 AS ord, '团队类型团级：memberCount >= 该值' AS rm UNION ALL
  SELECT 'team_camp_min', '10', 2, '团队类型营级：memberCount >= 该值' UNION ALL
  SELECT 'team_group_min', '4', 3, '团队类型小组：memberCount >= 该值（与原先 >3 一致）' UNION ALL
  SELECT 'role_regiment_min', '101', 4, '负责人角色团长：memberCount >= 该值' UNION ALL
  SELECT 'role_camp_min', '11', 5, '负责人角色营长' UNION ALL
  SELECT 'role_group_min', '3', 6, '负责人角色组长' UNION ALL
  SELECT 'personal_formation_min', '3', 7, '个人成团：team_invite_join 人数（含发起人）>= 该值则自动建团队'
) x ON 1=1
WHERE t.`key` = 'team_threshold'
AND NOT EXISTS (
  SELECT 1 FROM `dict_info` i WHERE i.typeId = t.id AND i.name = x.nm
);
