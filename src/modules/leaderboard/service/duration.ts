import { Provide } from '@midwayjs/core';
import { BaseService } from '@cool-midway/core';
import { Repository } from 'typeorm';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { UserInfoEntity } from '../../user/entity/info';

@Provide()
export class LeaderboardDurationService extends BaseService {
  @InjectEntityModel(UserInfoEntity)
  userInfoEntity: Repository<UserInfoEntity>;

  private fmt(d: Date) {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  /** 仅正整数为团队内排行；不传 / null / 0 / 非法值均为全站 */
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
    /** total 与其它未识别值：自 1970 起至当前，即全量时间窗 */
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

    /** 仅总榜 `range=total` 把 user_info.meditationExtraSeconds 计入展示与排序；日/周/月不加 */
    const applyMeditationExtra = range === 'total';
    const extraSql = applyMeditationExtra ? 'IFNULL(u.meditationExtraSeconds, 0)' : '0';
    const extraSecondsSelect = applyMeditationExtra
      ? 'IFNULL(u.meditationExtraSeconds, 0) AS extraSeconds'
      : '0 AS extraSeconds';

    const teamJoin = teamId
      ? 'INNER JOIN team_member tm ON tm.userId = u.id AND tm.teamId = ? AND tm.exitType = 0'
      : '';
    const teamArgs = teamId ? [teamId] : [];

    const sqlBase = `
      FROM user_info u
      ${teamJoin}
      LEFT JOIN (
        SELECT
          ms.userId AS userId,
          COUNT(1) AS reportCount,
          FLOOR(SUM(mr.totalDuration) / 60) AS minutes,
          ROUND(SUM(mr.totalDuration) / 3600, 2) AS hours,
          SUM(mr.totalDuration) AS seconds,
          MAX(ms.endDate) AS lastMeditationTime
        FROM meditation_report mr
        INNER JOIN meditation_session ms ON ms.id = mr.sessionId
        WHERE ms.status = 2 AND ms.endDate IS NOT NULL AND ms.endDate >= ? AND ms.endDate <= ?
        GROUP BY ms.userId
      ) r ON r.userId = u.id
      WHERE u.status = 1
    `;

    const countSql = `SELECT COUNT(1) AS total FROM (SELECT u.id ${sqlBase}) t`;
    const countArgs = [...teamArgs, startStr, endStr];
    const totalRow: any[] = await this.userInfoEntity.manager.query(countSql, countArgs);
    const total = Number(totalRow?.[0]?.total ?? 0);

    const listSql = `
      SELECT
        u.id AS userId,
        u.nickName AS nickName,
        u.avatarUrl AS avatarUrl,
        u.lastProvince AS lastProvince,
        u.lastCity AS lastCity,
        IFNULL(r.reportCount, 0) AS reportCount,
        FLOOR((IFNULL(r.seconds, 0) + ${extraSql}) / 60) AS minutes,
        ROUND((IFNULL(r.seconds, 0) + ${extraSql}) / 3600, 2) AS hours,
        IFNULL(r.seconds, 0) + ${extraSql} AS seconds,
        ${extraSecondsSelect},
        r.lastMeditationTime AS lastMeditationTime
      ${sqlBase}
      ORDER BY (IFNULL(r.seconds, 0) + ${extraSql}) DESC, IFNULL(r.lastMeditationTime, '1970-01-01') DESC, u.id DESC
      LIMIT ? OFFSET ?
    `;
    const listArgs = [...teamArgs, startStr, endStr, size, offset];
    const list = await this.userInfoEntity.manager.query(listSql, listArgs);

    return {
      list,
      pagination: { page, size, total },
      range: { range, start: startStr, end: endStr },
    };
  }
}

