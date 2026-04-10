import { ILogger, Inject, Logger, Provide } from '@midwayjs/core';
import { CoolEvent, Event } from '@cool-midway/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import * as moment from 'moment';
import { ActivityParticipationEntity } from '../entity/participation';
import { ActivityInfoEntity } from '../entity/info';
import { ActivityInfoService } from '../service/info';
import { MeditationSessionEntity } from '../../meditation/entity/session';
import { MeditationReportEntity } from '../../meditation/entity/report';

@Provide()
@CoolEvent()
export class ActivityAutoCheckinEvent {
  @InjectEntityModel(ActivityParticipationEntity)
  activityParticipationEntity: Repository<ActivityParticipationEntity>;

  @InjectEntityModel(MeditationReportEntity)
  meditationReportEntity: Repository<MeditationReportEntity>;

  @InjectEntityModel(MeditationSessionEntity)
  meditationSessionEntity: Repository<MeditationSessionEntity>;

  @Inject()
  activityInfoService: ActivityInfoService;

  @Logger()
  coreLogger: ILogger;

  private fmt(d: Date) {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  private parseCheckins(v: any) {
    if (Array.isArray(v)) return v;
    if (typeof v === 'string') {
      try {
        const parsed = JSON.parse(v);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    return [];
  }

  private async sumMeditationSeconds(userId: number, start: Date, end: Date) {
    const sql = `
      SELECT IFNULL(SUM(r.totalDuration), 0) AS seconds
      FROM meditation_report r
      INNER JOIN meditation_session s ON s.id = r.sessionId
      WHERE s.userId = ?
        AND s.status = 2
        AND s.endDate IS NOT NULL
        AND s.endDate >= ?
        AND s.endDate <= ?
    `;
    const rows: any[] = await this.meditationReportEntity.manager.query(sql, [
      userId,
      this.fmt(start),
      this.fmt(end),
    ]);
    return Number(rows?.[0]?.seconds ?? 0);
  }

  @Event('meditationEnded')
  async onMeditationEnded(session: any) {
    try {
      const userId = Number(session?.userId);
      if (!userId) return;

      const now = new Date();
      const endDateRaw = session?.endDate ? new Date(session.endDate) : now;
      const todayKey = moment(now).format('YYYY-MM-DD');
      const endKey = moment(endDateRaw).format('YYYY-MM-DD');
      if (todayKey !== endKey) return;

      const rows = await this.activityParticipationEntity
        .createQueryBuilder('p')
        .innerJoin(ActivityInfoEntity, 'a', 'p.activityId = a.id')
        .where('p.userId = :userId', { userId })
        .andWhere('a.status = :status', { status: 2 })
        .andWhere('(a.startDate IS NULL OR a.startDate <= :now)', { now })
        .andWhere('(a.endDate IS NULL OR a.endDate >= :now)', { now })
        .andWhere('a.targetMeditationSeconds > 0')
        .select('p.activityId', 'activityId')
        .addSelect('p.checkins', 'checkins')
        .addSelect('p.applyTime', 'applyTime')
        .addSelect('a.checkinMode', 'checkinMode')
        .addSelect('a.startDate', 'startDate')
        .addSelect('a.endDate', 'endDate')
        .addSelect('a.targetMeditationSeconds', 'targetMeditationSeconds')
        .addSelect('a.passPercent', 'passPercent')
        .getRawMany();

      for (const row of rows) {
        const activityId = Number(row.activityId);
        if (!activityId) continue;

        const checkinMode = Number(row.checkinMode) || 1;
        const checkins = this.parseCheckins(row.checkins);
        const threshold = Math.ceil(
          (Number(row.targetMeditationSeconds) || 0) *
            ((Number(row.passPercent) || 100) / 100)
        );
        if (threshold <= 0) continue;

        if (checkinMode === 2) {
          const existsChecked = checkins.some((d: any) => d?.checked);
          if (existsChecked) continue;

          const startCandidates: Date[] = [];
          if (row.startDate) startCandidates.push(new Date(row.startDate));
          if (row.applyTime) startCandidates.push(new Date(row.applyTime));
          const start =
            startCandidates.length > 0
              ? new Date(Math.max(...startCandidates.map(d => d.getTime())))
              : new Date(0);
          const end = row.endDate ? new Date(Math.min(new Date(row.endDate).getTime(), now.getTime())) : now;
          if (end.getTime() <= start.getTime()) continue;

          const seconds = await this.sumMeditationSeconds(userId, start, end);
          if (seconds >= threshold) {
            await this.activityInfoService.checkinActivity(userId, activityId, {}, 2);
          }
          continue;
        }

        const existsToday = checkins.some((d: any) => d?.date === todayKey && d?.checked);
        if (existsToday) continue;

        const startDay = moment(now).startOf('day').toDate();
        const endDay = now;
        const start = row.startDate
          ? new Date(Math.max(new Date(row.startDate).getTime(), startDay.getTime()))
          : startDay;
        const end = row.endDate
          ? new Date(Math.min(new Date(row.endDate).getTime(), endDay.getTime()))
          : endDay;
        if (end.getTime() <= start.getTime()) continue;

        const seconds = await this.sumMeditationSeconds(userId, start, end);
        if (seconds >= threshold) {
          await this.activityInfoService.checkinActivity(userId, activityId, {}, 2);
        }
      }
    } catch (e: any) {
      this.coreLogger.warn(
        `[ActivityAutoCheckinEvent] failed: ${e?.message ?? e}`
      );
    }
  }
}
