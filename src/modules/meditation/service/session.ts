
import { Provide } from '@midwayjs/core';
import { BaseService, CoolCommException, CoolEventManager } from '@cool-midway/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import { MeditationSessionEntity } from '../entity/session';
import { DeviceInfoEntity } from '../../device/entity/info';
import { MeditationReportEntity } from '../entity/report';
import { MeditationDataEntity } from '../entity/data';
import { Inject } from '@midwayjs/core';

import { DeviceInfoService } from '../../device/service/info';
import { BaseSysParamService } from '../../base/service/sys/param';
import * as zlib from 'zlib';
import { DictInfoService } from '../../dict/service/info';
import { UserInfoEntity } from '../../user/entity/info';

/**
 * 冥想会话服务
 */
@Provide()
export class MeditationSessionService extends BaseService {
  @InjectEntityModel(MeditationSessionEntity)
  meditationSessionEntity: Repository<MeditationSessionEntity>;

  @InjectEntityModel(DeviceInfoEntity)
  deviceInfoEntity: Repository<DeviceInfoEntity>;

  @InjectEntityModel(MeditationReportEntity)
  meditationReportEntity: Repository<MeditationReportEntity>;

  @InjectEntityModel(MeditationDataEntity)
  meditationDataEntity: Repository<MeditationDataEntity>;

  @InjectEntityModel(UserInfoEntity)
  userInfoEntity: Repository<UserInfoEntity>;

  @Inject()
  coolEventManager: CoolEventManager;

  @Inject()
  deviceInfoService: DeviceInfoService;

  @Inject()
  baseSysParamService: BaseSysParamService;

  @Inject()
  dictInfoService: DictInfoService;

  /**
   * 当前用户是否有进行中的冥想（status=1）
   */
  async getActiveSession(userId: number) {
    const session = await this.meditationSessionEntity.findOneBy({
      userId,
      status: 1,
    });
    if (!session) {
      return { hasActive: false, session: null };
    }
    const pollInterval =
      (await this.baseSysParamService.dataByKey('DEVICE_REALTIME_SYNC_INTERVAL')) || 3000;
    return {
      hasActive: true,
      session: {
        id: session.id,
        sessionId: session.id,
        sn: session.sn,
        type: session.type,
        startDate: session.startDate,
        targetDuration: session.targetDuration,
        lastActiveTime: session.lastActiveTime,
      },
      pollInterval,
    };
  }

  /**
   * 开始冥想
   */
  async start(userId: number, sn?: string, targetDuration?: number, type?: number) {
    let sessionType = type != null ? Number(type) : sn ? 1 : 2;
    if (sessionType !== 1 && sessionType !== 2) {
      sessionType = sn ? 1 : 2;
    }
    if (sessionType === 1) {
      let resolvedSn = sn ? String(sn).trim() : '';
      if (!resolvedSn) {
        resolvedSn = (await this.deviceInfoService.getPrimaryDeviceSn(userId)) || '';
      }
      if (!resolvedSn) {
        throw new CoolCommException('设备SN不能为空或未绑定设备');
      }
      sn = resolvedSn;
      const device = await this.deviceInfoEntity.findOneBy({ sn, userId });
      if (!device) {
        throw new CoolCommException('设备未绑定');
      }

      try {
        const info = await this.deviceInfoService.getDeviceInfo(device.mac);
        const data = info?.data;

        await this.deviceInfoEntity.update(device.id, {
          status: data?.status?.id,
          statusUpdateTime: new Date(),
        });

        if (data?.status?.id != 1) {
          throw new CoolCommException(`设备状态:${data?.status?.name},时间:${data?.status?.since}`);
        }
      } catch (e) {
        throw new CoolCommException(e.message || '获取设备状态失败');
      }
    } else {
      sn = null;
    }

    const active = await this.meditationSessionEntity.findOneBy({
      userId,
      status: 1,
    });
    if (active) {
      throw new CoolCommException('已有进行中的冥想');
    }

    const session = await this.meditationSessionEntity.save({
      userId,
      sn: sn || null,
      type: sessionType,
      startDate: new Date(),
      status: 1,
      targetDuration: targetDuration || 0,
      lastActiveTime: new Date(),
    });

    const pollInterval =
      (await this.baseSysParamService.dataByKey('DEVICE_REALTIME_SYNC_INTERVAL')) ||3000;
    return { ...session,sessionId: session.id, pollInterval };
  }

  /**
   * 轮询冥想状态
   */
  async poll(userId: number, sessionId?: number) {
    const session = sessionId
      ? await this.meditationSessionEntity.findOneBy({ id: sessionId, userId })
      : await this.meditationSessionEntity.findOneBy({ userId, status: 1 });

    if (!session || session.status !== 1) {
      return { status: 'ended', reason: 'finished', endReason: session?.endReason ?? null };
    }

    const timeout =
      (await this.baseSysParamService.dataByKey('MEDITATION_AUTO_END_TIMEOUT_MIN')) || 5;
    const now = Date.now();
    if (session.type === 2) {
      session.lastActiveTime = new Date();
      await this.meditationSessionEntity.save(session);
    }
    const lastActive = session.lastActiveTime ? session.lastActiveTime.getTime() : session.startDate.getTime();
    
    if (now - lastActive > timeout * 60 * 1000) {
      const endDateOverride = session.lastActiveTime ?? session.startDate;
      const effectiveMs = endDateOverride.getTime() - session.startDate.getTime();
      const endReason = effectiveMs < timeout * 60 * 1000 ? 4 : 2;
      await this.end(userId, session.id, endReason, endDateOverride);
      return { status: 'ended', reason: 'timeout', endReason };
    }

    if (session.targetDuration && session.targetDuration > 0) {
      const elapsedSec = Math.floor((now - session.startDate.getTime()) / 1000);
      if (elapsedSec >= session.targetDuration * 60) {
        await this.end(userId, session.id, 3);
        return { status: 'ended', reason: 'target', endReason: 3 };
      }
    }

    let resp = null;
    let saved = null;
    let deviceStatusId = null;
    if (session.type === 1 && session.sn) {
      const device = await this.deviceInfoEntity.findOneBy({ sn: session.sn });
      if (device) {
        try {
          const statusInterval =
            (await this.baseSysParamService.dataByKey('DEVICE_STATUS_SYNC_INTERVAL')) || 5000;
          const lastStatusTime = device.statusUpdateTime ? device.statusUpdateTime.getTime() : 0;
          const shouldRefreshStatus = !lastStatusTime || now - lastStatusTime >= statusInterval;

          if (shouldRefreshStatus) {
            const info = await this.deviceInfoService.getDeviceInfo(device.mac);
            const infoData = info?.data ?? info;
            deviceStatusId = infoData?.status?.id ?? null;
            await this.deviceInfoEntity.update(device.id, {
              status: deviceStatusId,
              statusUpdateTime: new Date(),
            });
          } else {
            deviceStatusId = device.status;
          }

          if (deviceStatusId == 1) {
            session.lastActiveTime = new Date();
            await this.meditationSessionEntity.save(session);
            const result = await this.deviceInfoService.getMeditationRealtimeData(device.mac);
            resp = result?.resp ?? null;
            saved = result?.saved ?? null;
          }
        } catch (e) {
        }
      }
    }

    const elapsed = Math.floor((now - session.startDate.getTime()) / 1000);

    return { 
      status: 'ongoing', 
      resp,
      saved,
      deviceStatusId,
      elapsed
    };
  }

  /**
   * 结束冥想
   */
  async end(
    userId: number,
    sessionId?: number,
    endReason = 1,
    endDateOverride?: Date
  ) {
    const session = sessionId
      ? await this.meditationSessionEntity.findOneBy({ id: sessionId, userId })
      : await this.meditationSessionEntity.findOneBy({ userId, status: 1 });

    if (!session) {
      throw new CoolCommException('冥想会话不存在');
    }

    if (session.status !== 1) {
      throw new CoolCommException('冥想会话已结束');
    }

    let endDate = endDateOverride ? new Date(endDateOverride) : new Date();
    if (session.startDate && endDate.getTime() < session.startDate.getTime()) {
      endDate = new Date(session.startDate);
    }
    await this.meditationSessionEntity.update(session.id, {
      endDate,
      status: 2,
      endReason,
    });
    (session as any).endDate = endDate;
    (session as any).status = 2;
    (session as any).endReason = endReason;

    const totalDuration = Math.max(
      0,
      Math.floor((endDate.getTime() - session.startDate.getTime()) / 1000)
    );

    let focusScore = 0;
    let metrics = {
      avgHeartRate: 0,
      avgBreathRate: 0,
      movementCount: 0,
      hrvScore: 0,
      hrvSource: 'none',
      avgTemperature: 0,
      avgHumidity: 0,
      peaceRatio: 0,
      relaxRatio: 0,
      tensionRatio: 0,
      anxietyRatio: 0,
      attachmentRatio: 50,
      sections: null,
      sitCount: 0,
    };

    if (session.type === 1) {
      const data = await this.meditationDataEntity.findBy({
        sessionId: session.id,
      });
      const calcResult = this.calcMetrics(data, session.startDate.getTime(), endDate.getTime());
      focusScore = calcResult.focusScore;
      metrics = calcResult.metrics;
    }
    
    const achievements = await this.calcAchievements(userId, endDate);

    const report = await this.meditationReportEntity.save({
      sessionId: session.id,
      totalDuration,
      focusScore,
      achievements,
      ...metrics,
    });

    const totals = await this.calcUserTotals(userId, endDate);
    await this.meditationReportEntity.update(report.id, totals as any);
    Object.assign(report as any, totals);

    // 触发冥想结束事件
    this.coolEventManager.emit('meditationEnded', session);

    return report;
  }

  async endStatus(userId: number, sessionId: number) {
    const report: any = await this.end(userId, sessionId, 1);
    const session = await this.meditationSessionEntity.findOneBy({ id: sessionId, userId });
    return {
      sessionId,
      reportId: report?.id ?? null,
      status: 'ended',
      endReason: session?.endReason ?? 1,
      endDate: session?.endDate ?? null,
    };
  }

  /**
   * 站内原始汇总（不含 user_info 补偿）
   */
  private async getPracticeRawTotals(userId: number) {
    const reports: any[] = await this.meditationReportEntity
      .createQueryBuilder('r')
      .leftJoin(MeditationSessionEntity, 's', 'r.sessionId = s.id')
      .where('s.userId = :userId', { userId })
      .select(['r.totalDuration as totalDuration'])
      .getRawMany();
    const totalSecondsRaw =
      (reports ?? []).reduce((sum, item) => sum + (Number(item?.totalDuration ?? 0) || 0), 0) || 0;

    const sessions = await this.meditationSessionEntity.find({
      where: { userId, status: 2 },
      select: ['startDate'],
      order: { startDate: 'DESC' } as any,
    });

    const days = new Set<string>();
    for (const s of sessions) {
      if (!s?.startDate) continue;
      days.add(s.startDate.toISOString().slice(0, 10));
    }
    return { totalSecondsRaw, distinctDayCount: days.size, days, sessions };
  }

  /**
   * 后台展示：站内原始 vs 含补偿后的累计天/小时（连续天仍仅按站内会话）
   */
  async getMeditationCumulativePreview(userId: number) {
    const raw = await this.getPracticeRawTotals(userId);
    const u = await this.userInfoEntity.findOne({
      where: { id: userId },
      select: ['meditationExtraSeconds', 'meditationExtraDays'],
    });
    const extraSec = Math.max(0, Math.floor(Number(u?.meditationExtraSeconds ?? 0) || 0));
    const extraDays = Math.max(0, Math.floor(Number(u?.meditationExtraDays ?? 0) || 0));
    const mergedSeconds = raw.totalSecondsRaw + extraSec;
    const rawHours = Number((raw.totalSecondsRaw / 3600).toFixed(2));
    const effectiveHours = Number((mergedSeconds / 3600).toFixed(2));
    return {
      meditationExtraSeconds: extraSec,
      meditationExtraDays: extraDays,
      rawTotalSeconds: raw.totalSecondsRaw,
      rawTotalDays: raw.distinctDayCount,
      rawTotalHours: rawHours,
      effectiveTotalDays: raw.distinctDayCount + extraDays,
      effectiveTotalHours: effectiveHours,
    };
  }

  private async calcUserTotals(userId: number, endDate: Date) {
    const raw = await this.getPracticeRawTotals(userId);
    const u = await this.userInfoEntity.findOne({
      where: { id: userId },
      select: ['meditationExtraSeconds', 'meditationExtraDays'],
    });
    const extraSec = Math.max(0, Math.floor(Number(u?.meditationExtraSeconds ?? 0) || 0));
    const extraDays = Math.max(0, Math.floor(Number(u?.meditationExtraDays ?? 0) || 0));
    const mergedSeconds = raw.totalSecondsRaw + extraSec;
    const totalHours = Number((mergedSeconds / 3600).toFixed(2));
    const totalDays = raw.distinctDayCount + extraDays;

    const endDay = endDate.toISOString().slice(0, 10);
    let consecutiveDays = 0;
    let cur = new Date(endDay);
    while (true) {
      const d = cur.toISOString().slice(0, 10);
      if (!raw.days.has(d)) break;
      consecutiveDays++;
      cur.setDate(cur.getDate() - 1);
      if (consecutiveDays > 3650) break;
    }

    return { totalDays, totalHours, consecutiveDays };
  }

  /**
   * 报告历史
   */
  async reportHistory(userId: number) {
    const rules = await this.getMeditationReportLevelRules();
    const rows: any[] = await this.meditationReportEntity
      .createQueryBuilder('a')
      .leftJoin(MeditationSessionEntity, 'b', 'a.sessionId = b.id')
      .where('b.userId = :userId', { userId })
      .orderBy('a.id', 'DESC')
      .select([
        'a.*',
        'b.sn',
        'b.type as sessionType',
        'b.startDate',
        'b.endDate',
        'b.targetDuration',
        'b.endReason',
      ])
      .getRawMany();

    return rows.map(row => this.normalizeReportHistoryRow(row, rules, false));
  }

  async reportHistoryPage(userId: number, page = 1, size = 20) {
    const rules = await this.getMeditationReportLevelRules();
    const p = Math.max(1, Number(page) || 1);
    const s = Math.max(1, Math.min(100, Number(size) || 20));

    const total = await this.meditationReportEntity
      .createQueryBuilder('a')
      .leftJoin(MeditationSessionEntity, 'b', 'a.sessionId = b.id')
      .where('b.userId = :userId', { userId })
      .getCount();

    const rows: any[] = await this.meditationReportEntity
      .createQueryBuilder('a')
      .leftJoin(MeditationSessionEntity, 'b', 'a.sessionId = b.id')
      .where('b.userId = :userId', { userId })
      .orderBy('a.id', 'DESC')
      .offset((p - 1) * s)
      .limit(s)
      .select([
        'a.*',
        'b.sn',
        'b.type as sessionType',
        'b.startDate',
        'b.endDate',
        'b.targetDuration',
        'b.endReason',
      ])
      .getRawMany();

    return {
      list: rows.map(row => this.normalizeReportHistoryRow(row, rules, false)),
      pagination: { page: p, size: s, total },
    };
  }

  async reportDetail(userId: number, sessionId: number) {
    const rules = await this.getMeditationReportLevelRules();
    const sid = Number(sessionId);
    if (!sid) throw new CoolCommException('sessionId 不合法');

    const row: any = await this.meditationReportEntity
      .createQueryBuilder('a')
      .leftJoin(MeditationSessionEntity, 'b', 'a.sessionId = b.id')
      .where('b.userId = :userId', { userId })
      .andWhere('a.sessionId = :sessionId', { sessionId: sid })
      .select([
        'a.*',
        'b.sn',
        'b.type as sessionType',
        'b.startDate',
        'b.endDate',
        'b.targetDuration',
        'b.endReason',
      ])
      .getRawOne();

    if (!row) return null;
    return this.normalizeReportHistoryRow(row, rules, true);
  }

  private normalizeReportHistoryRow(row: any, rules?: any, includeAnalysisDetails = true) {
    const sn = row?.b_sn ?? null;
    const sessionType = row?.sessionType ?? row?.b_sessionType ?? null;
    const startDate = row?.b_startDate ?? null;
    const endDate = row?.b_endDate ?? null;
    const targetDuration = row?.b_targetDuration ?? null;
    const endReason = row?.b_endReason ?? null;

    if (row?.b_sn !== undefined) delete row.b_sn;
    if (row?.b_sessionType !== undefined) delete row.b_sessionType;
    if (row?.b_startDate !== undefined) delete row.b_startDate;
    if (row?.b_endDate !== undefined) delete row.b_endDate;
    if (row?.b_targetDuration !== undefined) delete row.b_targetDuration;
    if (row?.b_endReason !== undefined) delete row.b_endReason;

    if (row?.aversionRatio !== undefined) delete row.aversionRatio;

    if (typeof row?.achievements === 'string') {
      try {
        row.achievements = JSON.parse(row.achievements);
      } catch (e) {}
    }
    if (!Array.isArray(row?.achievements)) row.achievements = [];

    if (typeof row?.sections === 'string') {
      try {
        row.sections = JSON.parse(row.sections);
      } catch (e) {}
    }
    if (!Array.isArray(row?.sections)) row.sections = null;

    const keys = ['peaceRatio', 'relaxRatio', 'tensionRatio', 'anxietyRatio'];
    for (const k of keys) {
      const v = Number(row?.[k] ?? 0);
      if (!Number.isFinite(v)) {
        row[k] = 0;
        continue;
      }
      row[k] = Math.max(0, Math.min(100, Math.round(v / 10) * 10));
    }

    const totalHours = row?.totalHours ?? row?.totalSeconds;
    if (row?.totalSeconds !== undefined) delete row.totalSeconds;

    const analysis = this.calcMeditationReportAnalysis(row, rules, includeAnalysisDetails);

    return {
      ...row,
      sn,
      sessionType,
      startDate,
      endDate,
      targetDuration,
      endReason,
      totalHours,
      ...analysis,
    };
  }

  private calcMeditationReportAnalysis(row: any, rules?: any, includeDetails = true) {
    const avgBreathRate = Number(row?.avgBreathRate ?? 0) || 0;
    const avgHeartRate = Number(row?.avgHeartRate ?? 0) || 0;
    const movementCount = Number(row?.movementCount ?? 0) || 0;
    const totalDuration = Number(row?.totalDuration ?? 0) || 0;
    const minutes = Math.max(1, totalDuration / 60);
    const movementPerMinute = movementCount / minutes;

    const breath = this.pickRule(rules?.breath, avgBreathRate);
    const heart = this.pickRule(rules?.heart, avgHeartRate);
    const stability = this.pickRule(rules?.stability, movementPerMinute);

    const summaryParts = [];
    if (stability?.short) summaryParts.push(stability.short);
    if (breath?.short) summaryParts.push(breath.short);
    if (heart?.short) summaryParts.push(heart.short);

    const summaryText = summaryParts.length ? `本次静坐：${summaryParts.join('，')}` : null;
    if (!includeDetails) {
      return { summaryText };
    }

    return {
      movementPerMinute: Number(movementPerMinute.toFixed(2)),
      breathLevel: breath?.level ?? null,
      breathText: breath?.text ?? null,
      breathShort: breath?.short ?? null,
      heartLevel: heart?.level ?? null,
      heartText: heart?.text ?? null,
      heartShort: heart?.short ?? null,
      stabilityLevel: stability?.level ?? null,
      stabilityText: stability?.text ?? null,
      stabilityShort: stability?.short ?? null,
      summaryText,
    };
  }

  private pickRule(rules: any[], value: number) {
    if (!Array.isArray(rules) || rules.length === 0) return null;
    const v = Number(value);
    if (!Number.isFinite(v) || v <= 0) return null;
    for (const r of rules) {
      const minOk = r.min == null || v >= r.min;
      const maxOk = r.max == null || v <= r.max;
      if (minOk && maxOk) return r;
    }
    return null;
  }

  private async getMeditationReportLevelRules() {
    const dict: any = await this.dictInfoService.data([
      'meditation_breath_level',
      'meditation_heart_level',
      'meditation_stability_level',
    ]);

    return {
      breath: this.parseLevelRules(dict?.meditation_breath_level),
      heart: this.parseLevelRules(dict?.meditation_heart_level),
      stability: this.parseLevelRules(dict?.meditation_stability_level),
    };
  }

  private parseLevelRules(items: any[]) {
    if (!Array.isArray(items) || items.length === 0) return [];
    const rules = [];
    for (const it of items) {
      let cfg: any = null;
      if (typeof it?.remark === 'string' && it.remark) {
        try {
          cfg = JSON.parse(it.remark);
        } catch (e) {}
      }
      if (!cfg || typeof cfg !== 'object') continue;
      const level = Number(it?.value ?? it?.id);
      rules.push({
        level: Number.isFinite(level) ? level : null,
        min: cfg.min ?? null,
        max: cfg.max ?? null,
        short: cfg.short ?? null,
        text: cfg.text ?? it?.name ?? null,
      });
    }
    rules.sort((a, b) => (Number(a.level) || 0) - (Number(b.level) || 0));
    return rules;
  }

  /**
   * 获取某次会话的详细生理数据
   */
  async getSessionDataList(userId: number, sessionId: number) {
    const session = await this.meditationSessionEntity.findOneBy({ id: sessionId, userId });
    if (!session) {
      throw new CoolCommException('冥想会话不存在或无权限');
    }

    const dataList = await this.meditationDataEntity.find({
      where: { sessionId },
      order: { recordTimestamp: 'ASC' },
    });

    return dataList.map(row => {
      let decoded: any = null;
      const blob: any = (row as any).waveBlob;
      if (blob) {
        try {
          const buf = Buffer.isBuffer(blob) ? blob : Buffer.from(blob);
          decoded = JSON.parse(zlib.gunzipSync(buf).toString('utf8'));
        } catch (e) {}
      }

      return {
        id: row.id,
        recordTimestamp: row.recordTimestamp,
        heartRate: row.heartRate,
        breathRate: row.breathRate,
        rightHeartRate: row.rightHeartRate,
        rightBreathRate: row.rightBreathRate,
        temperature: row.temperature,
        humidity: row.humidity,
        inBed: row.inBed,
        bodyMovement: row.bodyMovement,
        wave: decoded ? {
          left: {
            respiratory_wave: decoded?.left?.respiratory_wave ?? [],
            heart_rate_wave: decoded?.left?.heart_rate_wave ?? [],
          },
          right: {
            respiratory_wave: decoded?.right?.respiratory_wave ?? [],
            heart_rate_wave: decoded?.right?.heart_rate_wave ?? [],
          }
        } : null
      };
    });
  }

  async reportStatistics(userId: number, range = 'week') {
    const supportedRanges = ['day', 'week', 'month'];
    const normalizedRange = supportedRanges.includes(range) ? range : 'week';

    const currentPeriodRange = this.getPeriodRange(normalizedRange, 0);
    const previousPeriodRange = this.getPeriodRange(normalizedRange, -1);
    const currentStart = this.formatDateTime(currentPeriodRange.start);
    const currentEnd = this.formatDateTime(currentPeriodRange.end);
    const previousStart = this.formatDateTime(previousPeriodRange.start);
    const previousEnd = this.formatDateTime(previousPeriodRange.end);

    const [currentStats, previousStats, latestSessionInfo, last7Sessions] = await Promise.all([
      this.aggregatePeriod(userId, currentStart, currentEnd),
      this.aggregatePeriod(userId, previousStart, previousEnd),
      this.queryLatestSession(userId),
      this.queryLast7Sessions(userId),
    ]);

    const [currentBuckets, previousBuckets] = await Promise.all([
      this.querySevenBuckets(userId, currentStart, currentEnd, normalizedRange),
      this.querySevenBuckets(userId, previousStart, previousEnd, normalizedRange),
    ]);

    const last7SessionsTotalMinutes = last7Sessions.reduce(
      (sum, item) => sum + (item.durationMinutes || 0),
      0
    );

    let previousName: string;
    let currentName: string;
    if (normalizedRange === 'week') {
      previousName = '上周';
      currentName = '本周';
    } else if (normalizedRange === 'month') {
      previousName = '上月';
      currentName = '本月';
    } else {
      previousName = '昨天';
      currentName = '今天';
    }

    const durationChartData = {
      categories: currentBuckets.map(b => b.label),
      series: [
        {
          name: '时长',
          data: currentBuckets.map(b => this.round2(b.totalDurationMinutes)),
        },
      ],
    };

    const categories = currentBuckets.map(b => b.label);
    const pair = (
      label: string,
      prevField: 'avgHeartRate' | 'avgBreathRate' | 'movementCount' | 'totalDurationMinutes',
      currField: 'avgHeartRate' | 'avgBreathRate' | 'movementCount' | 'totalDurationMinutes'
    ) => ({
      series: [
        {
          name: `${label}（${previousName}）`,
          data: previousBuckets.map(b => this.round2(b[prevField])),
        },
        {
          name: `${label}（${currentName}）`,
          data: currentBuckets.map(b => this.round2(b[currField])),
        },
      ],
    });

    const compareChartData = {
      categories,
      /** 四个独立折线图：各含上一周期 + 当前周期两条线（各 7 桶，与 categories 对齐） */
      heartRate: pair('心率', 'avgHeartRate', 'avgHeartRate'),
      breathRate: pair('呼吸率', 'avgBreathRate', 'avgBreathRate'),
      movement: pair('体动', 'movementCount', 'movementCount'),
      duration: pair('时长', 'totalDurationMinutes', 'totalDurationMinutes'),
    };

    return {
      range: normalizedRange,
      bucketCount: 7,
      currentPeriod: {
        rangeStart: currentStart,
        rangeEnd: currentEnd,
        ...currentStats,
        latestSessionId: latestSessionInfo.sessionId,
        latestSessionMinutes: latestSessionInfo.durationMinutes,
      },
      previousPeriod: {
        rangeStart: previousStart,
        rangeEnd: previousEnd,
        ...previousStats,
      },
      latestSessionMinutes: latestSessionInfo.durationMinutes,
      last7SessionsTotalMinutes,
      last7Sessions,
      trend: currentBuckets.map(b => ({
        ...b,
        totalDurationMinutes: this.round2(b.totalDurationMinutes),
        avgHeartRate: this.round2(b.avgHeartRate),
        avgBreathRate: this.round2(b.avgBreathRate),
        movementCount: this.round2(b.movementCount),
      })),
      durationChartData,
      compareChartData,
    };
  }

  private getPeriodRange(range: string, offset: number) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    if (range === 'day') {
      const start = new Date(now);
      start.setDate(start.getDate() + offset);
      const end = new Date(start);
      end.setDate(start.getDate() + 1);
      return { start, end };
    }

    if (range === 'week') {
      const day = now.getDay();
      const diff = (day === 0 ? -6 : 1) - day;
      const start = new Date(now);
      start.setDate(now.getDate() + diff + offset * 7);
      const end = new Date(start);
      end.setDate(start.getDate() + 7);
      return { start, end };
    }

    const start = new Date(now.getFullYear(), now.getMonth() + offset, 1, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 1, 0, 0, 0, 0);
    return { start, end };
  }

  private formatDateTime(d: Date) {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  /** 图表数值：有小数时保留两位 */
  private round2(n: number) {
    return Math.round((Number(n) || 0) * 100) / 100;
  }

  /** 报告总时长（秒）→ 展示用分钟，不足 1 分钟保留小数（固定两位） */
  private totalDurationSecondsToMinutes(seconds: number) {
    return Number(((Number(seconds) || 0) / 60).toFixed(2));
  }

  private async aggregatePeriod(userId: number, start: string, end: string) {
    const sql = `
      SELECT
        COUNT(1) AS sessionCount,
        COALESCE(SUM(r.totalDuration), 0) AS totalDurationSeconds,
        COALESCE(AVG(NULLIF(r.avgHeartRate, 0)), 0) AS avgHeartRate,
        COALESCE(AVG(NULLIF(r.avgBreathRate, 0)), 0) AS avgBreathRate,
        COALESCE(SUM(r.movementCount), 0) AS movementCount
      FROM meditation_report r
      INNER JOIN meditation_session s ON s.id = r.sessionId
      WHERE s.userId = ?
        AND s.status = 2
        AND s.endDate >= ?
        AND s.endDate < ?
    `;
    const rows: any[] = await this.meditationReportEntity.manager.query(sql, [userId, start, end]);
    const row = rows?.[0] || {};
    const totalDurationSeconds = Number(row.totalDurationSeconds || 0);
    const totalDurationMinutes = this.totalDurationSecondsToMinutes(totalDurationSeconds);

    return {
      sessionCount: Number(row.sessionCount || 0),
      totalDurationMinutes,
      avgHeartRate: Number(row.avgHeartRate || 0),
      avgBreathRate: Number(row.avgBreathRate || 0),
      movementCount: Number(row.movementCount || 0),
      avgMovementPerMinute:
        totalDurationMinutes > 0
          ? Number((Number(row.movementCount || 0) / totalDurationMinutes).toFixed(2))
          : 0,
    };
  }

  /** 用户全局最近一次已结束会话（与统计周期无关） */
  private async queryLatestSession(userId: number) {
    const sql = `
      SELECT
        s.id AS sessionId,
        ROUND(r.totalDuration / 60, 2) AS durationMinutes
      FROM meditation_report r
      INNER JOIN meditation_session s ON s.id = r.sessionId
      WHERE s.userId = ?
        AND s.status = 2
        AND s.endDate IS NOT NULL
      ORDER BY s.endDate DESC
      LIMIT 1
    `;
    const rows: any[] = await this.meditationReportEntity.manager.query(sql, [userId]);
    const row = rows?.[0];
    return {
      sessionId: Number(row?.sessionId || 0),
      durationMinutes: Number(row?.durationMinutes || 0),
    };
  }

  private async queryLast7Sessions(userId: number) {
    const sql = `
      SELECT
        s.id AS sessionId,
        s.startDate AS startDate,
        s.endDate AS endDate,
        ROUND(r.totalDuration / 60, 2) AS durationMinutes,
        r.avgHeartRate AS avgHeartRate,
        r.avgBreathRate AS avgBreathRate,
        r.movementCount AS movementCount
      FROM meditation_report r
      INNER JOIN meditation_session s ON s.id = r.sessionId
      WHERE s.userId = ?
        AND s.status = 2
        AND s.endDate IS NOT NULL
      ORDER BY s.endDate DESC
      LIMIT 7
    `;
    const rows: any[] = await this.meditationReportEntity.manager.query(sql, [userId]);
    return rows.map(row => ({
      sessionId: Number(row.sessionId || 0),
      startDate: row.startDate || null,
      endDate: row.endDate || null,
      durationMinutes: Number(row.durationMinutes || 0),
      avgHeartRate: Number(row.avgHeartRate || 0),
      avgBreathRate: Number(row.avgBreathRate || 0),
      movementCount: Number(row.movementCount || 0),
    }));
  }

  /** SQL 日期时间字符串转 Date（本地解析） */
  private parseSqlDateTime(s: string) {
    return new Date(String(s).replace(' ', 'T'));
  }

  /** 7 等分时间桶的横轴文案：周=星期，日=桶起点时分，月=月/日 */
  private bucketAxisLabel(index: number, normalizedRange: string, segmentStartStr: string) {
    const d = this.parseSqlDateTime(segmentStartStr);
    if (normalizedRange === 'week') {
      const w = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      return w[d.getDay()] ?? `段${index + 1}`;
    }
    if (normalizedRange === 'day') {
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }
    return `${d.getMonth() + 1}/${d.getDate()}`;
  }

  /**
   * 将 [rangeStart, rangeEnd) 等分为 7 段，分别聚合冥想时长等指标（保证图表与 trend 恒为 7 点）
   */
  private async querySevenBuckets(
    userId: number,
    rangeStartStr: string,
    rangeEndStr: string,
    normalizedRange: string
  ) {
    const start = this.parseSqlDateTime(rangeStartStr);
    const end = this.parseSqlDateTime(rangeEndStr);
    const totalMs = end.getTime() - start.getTime();

    const empty = (i: number) => ({
      index: i,
      label: `段${i + 1}`,
      rangeStart: rangeStartStr,
      rangeEnd: rangeEndStr,
      totalDurationMinutes: 0,
      sessionCount: 0,
      avgHeartRate: 0,
      avgBreathRate: 0,
      movementCount: 0,
    });

    if (!Number.isFinite(totalMs) || totalMs <= 0) {
      return Array.from({ length: 7 }, (_, i) => empty(i));
    }

    const segMs = totalMs / 7;
    const tasks = [];
    for (let i = 0; i < 7; i++) {
      const segStart = new Date(start.getTime() + i * segMs);
      const segEnd = new Date(start.getTime() + (i + 1) * segMs);
      const startStr = this.formatDateTime(segStart);
      const endStr = this.formatDateTime(segEnd);
      tasks.push(
        this.aggregatePeriod(userId, startStr, endStr).then(stats => ({
          index: i,
          label: this.bucketAxisLabel(i, normalizedRange, startStr),
          rangeStart: startStr,
          rangeEnd: endStr,
          totalDurationMinutes: stats.totalDurationMinutes,
          sessionCount: stats.sessionCount,
          avgHeartRate: stats.avgHeartRate,
          avgBreathRate: stats.avgBreathRate,
          movementCount: stats.movementCount,
        }))
      );
    }
    return Promise.all(tasks);
  }

  async autoEndExpiredDeviceSessions() {
    const enabled = await this.baseSysParamService.dataByKey('MEDITATION_AUTO_END_JOB_ENABLED');
    if (enabled === 0 || enabled === '0' || enabled === false) return;

    const timeout =
      (await this.baseSysParamService.dataByKey('MEDITATION_AUTO_END_TIMEOUT_MIN')) ||
      (await this.baseSysParamService.dataByKey('MEDITATION_AUTO_END_TIMEOUT')) ||
      5;

    const threshold = new Date(Date.now() - timeout * 60 * 1000);
    const sessions = await this.meditationSessionEntity
      .createQueryBuilder('a')
      .where('a.status = :status', { status: 1 })
      .andWhere('a.type = :type', { type: 1 })
      .andWhere('(a.lastActiveTime IS NULL AND a.startDate < :threshold OR a.lastActiveTime < :threshold)', {
        threshold,
      })
      .select(['a.id', 'a.userId', 'a.startDate', 'a.lastActiveTime'])
      .getMany();

    for (const s of sessions) {
      try {
        const endDateOverride = (s as any).lastActiveTime ?? (s as any).startDate;
        const effectiveMs = endDateOverride.getTime() - (s as any).startDate.getTime();
        const endReason = effectiveMs < timeout * 60 * 1000 ? 4 : 2;
        await this.end(s.userId, s.id, endReason, endDateOverride);
      } catch (e) {}
    }
  }

  private calcMetrics(data: MeditationDataEntity[], startMs: number, endMs: number) {
    const defaultMetrics = {
      avgHeartRate: 0,
      avgBreathRate: 0,
      movementCount: 0,
      hrvScore: 0,
      hrvSource: 'none',
      avgTemperature: 0,
      avgHumidity: 0,
      peaceRatio: 0,
      relaxRatio: 0,
      tensionRatio: 0,
      anxietyRatio: 0,
      attachmentRatio: 50,
      sections: null,
      sitCount: 0,
    };

    if (!data || data.length === 0) {
      return { focusScore: 0, metrics: defaultMetrics };
    }

    // 判断左边还是右边有数据
    let leftCount = 0;
    let rightCount = 0;
    for (const item of data) {
      if (item.heartRate > 0 || item.breathRate > 0) leftCount++;
      if (item.rightHeartRate > 0 || item.rightBreathRate > 0) rightCount++;
    }
    const useRight = rightCount > leftCount;

    const validData = data
      .map(item => ({
        ...item,
        activeHeartRate: useRight ? item.rightHeartRate : item.heartRate,
        activeBreathRate: useRight ? item.rightBreathRate : item.breathRate,
      }))
      .sort((a, b) => (a.recordTimestamp || 0) - (b.recordTimestamp || 0));

    // 1. 专注度评分
    const avgMovement = validData.reduce((sum, item) => sum + (item.bodyMovement || 0), 0) / validData.length;
    const avgHeart = validData.reduce((sum, item) => sum + (item.activeHeartRate || 0), 0) / validData.length;
    const focusScoreRaw = 100 - (avgMovement * 2 + (100 - avgHeart));
    const focusScore = Math.max(0, Math.min(100, Math.round(focusScoreRaw)));

    // 2. 平均心率、呼吸率，体动次数
    let validHeartCount = 0;
    let validBreathCount = 0;
    let sumHeart = 0;
    let sumBreath = 0;
    let movementCount = 0;
    let validTempCount = 0;
    let validHumidityCount = 0;
    let sumTemp = 0;
    let sumHumidity = 0;

    for (const item of validData) {
      if (item.activeHeartRate > 0) {
        sumHeart += item.activeHeartRate;
        validHeartCount++;
      }
      if (item.activeBreathRate > 0) {
        sumBreath += item.activeBreathRate;
        validBreathCount++;
      }
      if (item.bodyMovement > 0) {
        movementCount++;
      }
      if (Number(item.temperature) > 0) {
        sumTemp += Number(item.temperature);
        validTempCount++;
      }
      if (Number(item.humidity) > 0) {
        sumHumidity += Number(item.humidity);
        validHumidityCount++;
      }
    }

    const avgHeartRate = validHeartCount > 0 ? Math.round(sumHeart / validHeartCount) : 0;
    const avgBreathRate = validBreathCount > 0 ? Math.round(sumBreath / validBreathCount) : 0;
    const avgTemperature = validTempCount > 0 ? Number((sumTemp / validTempCount).toFixed(2)) : 0;
    const avgHumidity = validHumidityCount > 0 ? Number((sumHumidity / validHumidityCount).toFixed(2)) : 0;

    let hrvSource = 'none';
    let hrvScore = 0;
    const heartRates = validData.filter(d => d.activeHeartRate > 0).map(d => d.activeHeartRate);
    if (heartRates.length > 1) {
      let sumSqDiff = 0;
      for (let i = 1; i < heartRates.length; i++) {
        const diff = heartRates[i] - heartRates[i - 1];
        sumSqDiff += diff * diff;
      }
      const rmssd = Math.sqrt(sumSqDiff / (heartRates.length - 1));
      hrvScore = Math.max(0, Math.min(100, Math.round((rmssd / 50) * 100)));
      hrvSource = 'heartRate';
    }

    // 4. 情绪云图占比 & 执着/厌离 占比
    let peaceCount = 0;
    let relaxCount = 0;
    let tensionCount = 0;
    let anxietyCount = 0;
    
    let attachmentCount = 0;
    let aversionCount = 0;

    for (const item of validData) {
      const hr = item.activeHeartRate;
      const mv = item.bodyMovement;
      
      if (hr <= 0) continue;

      // 情绪云图 (基于心率与基线的偏差，以及体动)
      // 假设静息心率基线为 avgHeartRate，高心率+高体动 = 焦虑(深红)
      if (hr > avgHeartRate * 1.1 && mv > 0) {
        anxietyCount++;
      } else if (hr > avgHeartRate * 1.05) {
        tensionCount++;
      } else if (hr < avgHeartRate * 0.95 && mv === 0) {
        peaceCount++;
      } else {
        relaxCount++;
      }

      // 执着与厌离
      // 执着 (Attachment): 心率持续高于平均，但体动少 (专注但紧张)
      if (hr > avgHeartRate && mv === 0) {
        attachmentCount++;
      }
      // 厌离 (Aversion): 心率偏低但体动频繁 (烦躁不安，想离开)
      else if (hr < avgHeartRate && mv > 0) {
        aversionCount++;
      }
    }

    const totalEmotion = peaceCount + relaxCount + tensionCount + anxietyCount;
    let peaceRatio = 0,
      relaxRatio = 0,
      tensionRatio = 0,
      anxietyRatio = 0;
    if (totalEmotion > 0) {
      const quantized = this.quantizeRatiosToTens([
        peaceCount / totalEmotion * 100,
        relaxCount / totalEmotion * 100,
        tensionCount / totalEmotion * 100,
        anxietyCount / totalEmotion * 100,
      ]);
      peaceRatio = quantized[0];
      relaxRatio = quantized[1];
      tensionRatio = quantized[2];
      anxietyRatio = quantized[3];
    }

    let attachmentRatio = 50;
    const validSampleCount = validData.filter(d => d.activeHeartRate > 0).length;
    if (validSampleCount > 0) {
      const aversionPercent = aversionCount / validSampleCount;
      attachmentRatio = Math.max(1, Math.min(100, Math.round(aversionPercent * 99 + 1)));
    }

    const sitCount = this.calcSitCount(validData);
    const sections = this.calcSections(validData, startMs, endMs);

    return {
      focusScore,
      metrics: {
        avgHeartRate,
        avgBreathRate,
        movementCount,
        hrvScore,
        hrvSource,
        avgTemperature,
        avgHumidity,
        peaceRatio,
        relaxRatio,
        tensionRatio,
        anxietyRatio,
        attachmentRatio,
        sections,
        sitCount,
      }
    };
  }

  private calcSitCount(rows: any[]) {
    if (!rows?.length) return 0;
    let sitCount = 0;
    let prev = null;
    for (const r of rows) {
      const cur = Number(r?.inBed ?? 0) ? 1 : 0;
      if (cur === 1 && (prev === null || prev === 0)) sitCount++;
      prev = cur;
    }
    return sitCount;
  }

  private calcSections(rows: any[], startMs: number, endMs: number) {
    const s = Number(startMs || 0);
    const e = Number(endMs || 0);
    if (!rows?.length || !s || !e || e <= s) {
      return Array.from({ length: 6 }).map((_, i) => ({
        index: i + 1,
        avgHeartRate: 0,
        avgBreathRate: 0,
        movementCount: 0,
      }));
    }

    const totalMs = e - s;
    const partMs = totalMs / 6;

    const sections = [];
    for (let i = 0; i < 6; i++) {
      const segStart = s + partMs * i;
      const segEnd = i === 5 ? e : s + partMs * (i + 1);

      let sumHeart = 0;
      let cntHeart = 0;
      let sumBreath = 0;
      let cntBreath = 0;
      let movementCount = 0;

      for (const r of rows) {
        const ts = Number(r?.recordTimestamp ?? 0);
        if (!ts) continue;
        const inRange = i === 5 ? ts >= segStart && ts <= segEnd : ts >= segStart && ts < segEnd;
        if (!inRange) continue;

        const hr = Number(r?.activeHeartRate ?? 0) || 0;
        const br = Number(r?.activeBreathRate ?? 0) || 0;
        if (hr > 0) {
          sumHeart += hr;
          cntHeart++;
        }
        if (br > 0) {
          sumBreath += br;
          cntBreath++;
        }
        if (Number(r?.bodyMovement ?? 0) > 0) movementCount++;
      }

      sections.push({
        index: i + 1,
        avgHeartRate: cntHeart > 0 ? Math.round(sumHeart / cntHeart) : 0,
        avgBreathRate: cntBreath > 0 ? Math.round(sumBreath / cntBreath) : 0,
        movementCount,
      });
    }

    return sections;
  }

  private quantizeRatiosToTens(rawRatios: number[]) {
    const safe = rawRatios.map(v => (Number.isFinite(v) ? Math.max(0, v) : 0));
    const rounded = safe.map(v => {
      const x = Math.round(v / 10) * 10;
      return Math.max(0, Math.min(100, x));
    });

    const total = rounded.reduce((a, b) => a + b, 0);
    let diff = 100 - total;
    if (diff === 0) return rounded;

    const order = safe
      .map((v, i) => ({
        i,
        frac: v - (Math.round(v / 10) * 10),
      }))
      .sort((a, b) => (diff > 0 ? b.frac - a.frac : a.frac - b.frac));

    let guard = 0;
    while (diff !== 0 && guard < 100) {
      for (const { i } of order) {
        if (diff === 0) break;
        if (diff > 0) {
          if (rounded[i] <= 90) {
            rounded[i] += 10;
            diff -= 10;
          }
        } else {
          if (rounded[i] >= 10) {
            rounded[i] -= 10;
            diff += 10;
          }
        }
      }
      guard++;
      if (guard >= 100) break;
    }

    return rounded;
  }

  private async calcAchievements(userId: number, endDate: Date) {
    const start = new Date(endDate);
    start.setDate(start.getDate() - 6);
    const sessions = await this.meditationSessionEntity
      .createQueryBuilder('a')
      .where('a.userId = :userId', { userId })
      .andWhere('a.startDate >= :start', { start })
      .andWhere('a.status = :status', { status: 2 })
      .select(['a.startDate'])
      .getMany();

    const days = new Set(
      sessions.map(item => item.startDate.toISOString().slice(0, 10))
    );
    const achievements = [] as string[];
    if (days.size >= 7) {
      achievements.push('连续7天');
    }
    return achievements;
  }
}
