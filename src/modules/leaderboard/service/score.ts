import { Inject, Provide } from '@midwayjs/core';
import { BaseService } from '@cool-midway/core';
import { Repository } from 'typeorm';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { UserInfoEntity } from '../../user/entity/info';
import { TeamMemberEntity } from '../../team/entity/member';
import { PostInfoEntity } from '../../post/entity/info';
import { PostLikeEntity } from '../../post/entity/like';
import { MeditationSessionEntity } from '../../meditation/entity/session';
import { MeditationReportEntity } from '../../meditation/entity/report';
import { ActivityCheckinLogEntity } from '../../activity/entity/checkinLog';
import { BaseSysParamService } from '../../base/service/sys/param';

@Provide()
export class LeaderboardScoreService extends BaseService {
  @Inject()
  baseSysParamService: BaseSysParamService;

  @InjectEntityModel(UserInfoEntity)
  userInfoEntity: Repository<UserInfoEntity>;

  @InjectEntityModel(TeamMemberEntity)
  teamMemberEntity: Repository<TeamMemberEntity>;

  @InjectEntityModel(PostInfoEntity)
  postInfoEntity: Repository<PostInfoEntity>;

  @InjectEntityModel(PostLikeEntity)
  postLikeEntity: Repository<PostLikeEntity>;

  @InjectEntityModel(MeditationSessionEntity)
  meditationSessionEntity: Repository<MeditationSessionEntity>;

  @InjectEntityModel(MeditationReportEntity)
  meditationReportEntity: Repository<MeditationReportEntity>;

  @InjectEntityModel(ActivityCheckinLogEntity)
  activityCheckinLogEntity: Repository<ActivityCheckinLogEntity>;

  private fmt(d: Date) {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  /** 仅正整数为团队内排行；不传 / null / 0 / 非法值均为全站（与时长榜一致） */
  private parseTeamId(raw: any): number | null {
    if (raw === undefined || raw === null || raw === '') {
      return null;
    }
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) {
      return null;
    }
    return Math.floor(n);
  }

  private rangeStart(range: string) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    if (range === 'day') return now;
    if (range === 'month') return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    if (range === 'week') {
      const day = now.getDay();
      const diff = (day === 0 ? -6 : 1) - day;
      const start = new Date(now);
      start.setDate(now.getDate() + diff);
      return start;
    }
    return new Date(1970, 0, 1, 0, 0, 0);
  }

  async page(params: any) {
    const page = Math.max(Number(params?.page ?? 1), 1);
    const size = Math.min(Math.max(Number(params?.size ?? 20), 1), 100);
    const range = String(params?.range ?? 'week');
    const teamId = this.parseTeamId(params?.teamId);

    const start = this.rangeStart(range);
    const end = new Date();
    const startStr = this.fmt(start);
    const endStr = this.fmt(end);
    const offset = (page - 1) * size;

    const defaultWeights = {
      w_like_ln: 5,
      w_post: 2,
      w_checkin: 10,
      w_report_device: 8,
      w_report_nodevice: 2,
      w_min_device: 1,
      w_min_nodevice: 0.3,
      cap_min_device: 600,
      cap_min_nodevice: 120,
    };
    const weightsRaw = await this.baseSysParamService.dataByKey('LEADERBOARD_SCORE_WEIGHTS');
    const weights = {
      ...defaultWeights,
      ...(weightsRaw && typeof weightsRaw === 'object' ? weightsRaw : {}),
    };

    const teamJoin = teamId
      ? 'INNER JOIN team_member tm ON tm.userId = u.id AND tm.teamId = ? AND tm.exitType = 0'
      : '';
    const teamArgs = teamId ? [teamId] : [];

    const sqlBase = `
      FROM user_info u
      ${teamJoin}
      LEFT JOIN (
        SELECT p.userId AS userId, COUNT(1) AS likes
        FROM post_like pl
        INNER JOIN post_info p ON p.id = pl.postId AND p.status = 2
        WHERE pl.createTime >= ? AND pl.createTime <= ?
        GROUP BY p.userId
      ) l ON l.userId = u.id
      LEFT JOIN (
        SELECT p.userId AS userId, COUNT(1) AS postCount
        FROM post_info p
        WHERE p.status = 2 AND p.createTime >= ? AND p.createTime <= ?
        GROUP BY p.userId
      ) pc ON pc.userId = u.id
      LEFT JOIN (
        SELECT
          acl.userId AS userId,
          SUM(CASE WHEN acl.source = 2 THEN 1 ELSE 0.5 END) AS checkinsScore,
          SUM(CASE WHEN acl.source = 2 THEN 1 ELSE 0 END) AS checkinsAuto,
          SUM(CASE WHEN acl.source = 1 THEN 1 ELSE 0 END) AS checkinsManual
        FROM activity_checkin_log acl
        WHERE acl.result = 1 AND acl.checkinTime >= ? AND acl.checkinTime <= ?
        GROUP BY acl.userId
      ) c ON c.userId = u.id
      LEFT JOIN (
        SELECT ms.userId AS userId,
          COUNT(1) AS reportCount,
          SUM(CASE WHEN ms.type = 1 THEN 1 ELSE 0 END) AS reportCountDevice,
          SUM(CASE WHEN ms.type = 2 THEN 1 ELSE 0 END) AS reportCountNoDevice,
          FLOOR(SUM(mr.totalDuration) / 60) AS minutes,
          FLOOR(SUM(CASE WHEN ms.type = 1 THEN mr.totalDuration ELSE 0 END) / 60) AS minutesDevice,
          FLOOR(SUM(CASE WHEN ms.type = 2 THEN mr.totalDuration ELSE 0 END) / 60) AS minutesNoDevice
        FROM meditation_report mr
        INNER JOIN meditation_session ms ON ms.id = mr.sessionId
        WHERE ms.status = 2 AND ms.endDate IS NOT NULL AND ms.endDate >= ? AND ms.endDate <= ?
        GROUP BY ms.userId
      ) r ON r.userId = u.id
      LEFT JOIN (
        SELECT ms.userId AS userId, MAX(ms.endDate) AS lastMeditationTime
        FROM meditation_session ms
        WHERE ms.status = 2 AND ms.endDate IS NOT NULL
        GROUP BY ms.userId
      ) lm ON lm.userId = u.id
      WHERE u.status = 1
        AND (
          IFNULL(l.likes, 0) > 0
          OR IFNULL(pc.postCount, 0) > 0
          OR IFNULL(c.checkinsScore, 0) > 0
          OR IFNULL(r.reportCount, 0) > 0
          OR IFNULL(r.minutes, 0) > 0
        )
    `;

    const countSql = `SELECT COUNT(1) AS total FROM (SELECT u.id ${sqlBase}) t`;
    const countArgs = [...teamArgs, startStr, endStr, startStr, endStr, startStr, endStr, startStr, endStr];
    const totalRow: any[] = await this.userInfoEntity.manager.query(countSql, countArgs);
    const total = Number(totalRow?.[0]?.total ?? 0);

    const listSql = `
      SELECT
        u.id AS userId,
        u.nickName AS nickName,
        u.avatarUrl AS avatarUrl,
        u.lastProvince AS lastProvince,
        u.lastCity AS lastCity,
        IFNULL(l.likes, 0) AS likes,
        IFNULL(pc.postCount, 0) AS postCount,
        IFNULL(c.checkinsScore, 0) AS checkins,
        IFNULL(c.checkinsAuto, 0) AS checkinsAuto,
        IFNULL(c.checkinsManual, 0) AS checkinsManual,
        IFNULL(r.reportCount, 0) AS reportCount,
        IFNULL(r.reportCountDevice, 0) AS reportCountDevice,
        IFNULL(r.reportCountNoDevice, 0) AS reportCountNoDevice,
        IFNULL(r.minutes, 0) AS minutes,
        IFNULL(r.minutesDevice, 0) AS minutesDevice,
        IFNULL(r.minutesNoDevice, 0) AS minutesNoDevice,
        lm.lastMeditationTime AS lastMeditationTime,
        ROUND(
          ? * IFNULL(r.reportCountDevice, 0)
          + ? * IFNULL(r.reportCountNoDevice, 0),
          2
        ) AS reportScore,
        ROUND(
          LEAST(IFNULL(r.minutesDevice, 0), ?) * ?
          + LEAST(IFNULL(r.minutesNoDevice, 0), ?) * ?,
          2
        ) AS minutesScore,
        ROUND(
          ? * LN(1 + IFNULL(l.likes, 0))
          + ? * IFNULL(pc.postCount, 0)
          + ? * IFNULL(c.checkinsScore, 0)
          + (? * IFNULL(r.reportCountDevice, 0) + ? * IFNULL(r.reportCountNoDevice, 0))
          + (LEAST(IFNULL(r.minutesDevice, 0), ?) * ? + LEAST(IFNULL(r.minutesNoDevice, 0), ?) * ?),
          2
        ) AS score
      ${sqlBase}
      ORDER BY score DESC, lm.lastMeditationTime DESC, u.id DESC
      LIMIT ? OFFSET ?
    `;
    const listArgs = [
      weights.w_report_device,
      weights.w_report_nodevice,
      weights.cap_min_device,
      weights.w_min_device,
      weights.cap_min_nodevice,
      weights.w_min_nodevice,
      weights.w_like_ln,
      weights.w_post,
      weights.w_checkin,
      weights.w_report_device,
      weights.w_report_nodevice,
      weights.cap_min_device,
      weights.w_min_device,
      weights.cap_min_nodevice,
      weights.w_min_nodevice,
      ...teamArgs,
      startStr,
      endStr,
      startStr,
      endStr,
      startStr,
      endStr,
      startStr,
      endStr,
      size,
      offset,
    ];
    const list = await this.userInfoEntity.manager.query(listSql, listArgs);

    return {
      list,
      pagination: { page, size, total },
      range: { range, start: startStr, end: endStr },
      weights,
    };
  }
}
