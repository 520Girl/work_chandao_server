import { Provide } from '@midwayjs/core';
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

@Provide()
export class LeaderboardScoreService extends BaseService {
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
    const teamId = params?.teamId != null ? Number(params.teamId) : null;

    const start = this.rangeStart(range);
    const end = new Date();
    const startStr = this.fmt(start);
    const endStr = this.fmt(end);
    const offset = (page - 1) * size;

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
          FLOOR(SUM(mr.totalDuration) / 60) AS minutes
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
        IFNULL(r.minutes, 0) AS minutes,
        lm.lastMeditationTime AS lastMeditationTime,
        ROUND(
          5 * LN(1 + IFNULL(l.likes, 0))
          + 2 * IFNULL(pc.postCount, 0)
          + 10 * IFNULL(c.checkinsScore, 0)
          + 8 * IFNULL(r.reportCount, 0)
          + LEAST(IFNULL(r.minutes, 0), 600),
          2
        ) AS score
      ${sqlBase}
      ORDER BY score DESC, lm.lastMeditationTime DESC, u.id DESC
      LIMIT ? OFFSET ?
    `;
    const listArgs = [...teamArgs, startStr, endStr, startStr, endStr, startStr, endStr, startStr, endStr, size, offset];
    const list = await this.userInfoEntity.manager.query(listSql, listArgs);

    return {
      list,
      pagination: { page, size, total },
      range: { range, start: startStr, end: endStr },
    };
  }
}
