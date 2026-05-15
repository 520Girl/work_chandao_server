
import { ILogger, Logger, Provide } from '@midwayjs/core';
import { BaseService, CoolCommException, CoolEventManager } from '@cool-midway/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityInfoEntity } from '../entity/info';
import { ActivityParticipationEntity } from '../entity/participation';
import { ActivityTemplateEntity } from '../entity/template';
import { ActivityCheckinLogEntity } from '../entity/checkinLog';
import { TeamInfoEntity } from '../../team/entity/info';
import { TeamMemberEntity } from '../../team/entity/member';
import { Inject } from '@midwayjs/core';
import { MessageInfoService } from '../../message/service/info';
import { Utils } from '../../../comm/utils';
import { GeoService } from '../../base/service/geo';
import { UserInfoEntity } from '../../user/entity/info';
import { AppActivityCreateFromTemplateDTO } from '../dto/activity';
import * as moment from 'moment';
import { MeditationReportEntity } from '../../meditation/entity/report';
import { MeditationSessionEntity } from '../../meditation/entity/session';

/**
 * 活动服务
 */
@Provide()
export class ActivityInfoService extends BaseService {
  @InjectEntityModel(ActivityInfoEntity)
  activityInfoEntity: Repository<ActivityInfoEntity>;

  @InjectEntityModel(ActivityParticipationEntity)
  activityParticipationEntity: Repository<ActivityParticipationEntity>;

  @InjectEntityModel(ActivityCheckinLogEntity)
  activityCheckinLogEntity: Repository<ActivityCheckinLogEntity>;

  @InjectEntityModel(ActivityTemplateEntity)
  activityTemplateEntity: Repository<ActivityTemplateEntity>;

  @InjectEntityModel(TeamMemberEntity)
  teamMemberEntity: Repository<TeamMemberEntity>;

  @InjectEntityModel(UserInfoEntity)
  userInfoEntity: Repository<UserInfoEntity>;

  @InjectEntityModel(TeamInfoEntity)
  teamInfoEntity: Repository<TeamInfoEntity>;

  @InjectEntityModel(MeditationReportEntity)
  meditationReportEntity: Repository<MeditationReportEntity>;

  @InjectEntityModel(MeditationSessionEntity)
  meditationSessionEntity: Repository<MeditationSessionEntity>;

  @Logger()
  logger: ILogger;

  @Inject()
  coolEventManager: CoolEventManager;

  @Inject()
  ctx;

  @Inject()
  messageInfoService: MessageInfoService;

  @Inject()
  utils: Utils;

  @Inject()
  geoService: GeoService;

  private fmtTs(d: Date) {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  /**
   * 共修排行：计划窗向两侧扩张的容差秒数。可在活动 sessionConfig.rankGraceSeconds 配置（0～300），缺省 30。
   * 仅用于「整段落在窗内」判定时放宽边界，减少时钟/网络导致的贴边数据被排除。
   */
  private getGroupRankGraceSec(cfg: Record<string, any>): number {
    const n = Number(cfg?.rankGraceSeconds);
    if (Number.isFinite(n) && n >= 0 && n <= 300) return Math.floor(n);
    return 30;
  }

  /** 排行 SQL 使用的有效边界：start 前移、end 后移 grace 秒 */
  private getGroupRankWindowBounds(startAt: Date, endAt: Date, graceSec: number): { rankStart: Date; rankEnd: Date } {
    const g = Math.max(0, graceSec) * 1000;
    return {
      rankStart: new Date(startAt.getTime() - g),
      rankEnd: new Date(endAt.getTime() + g),
    };
  }

  /** 结束时间减开始时间的秒数（用于多人共修 targetMeditationSeconds） */
  private diffSecondsEndMinusStart(start: Date | string, end: Date | string): number {
    const s = start instanceof Date ? start : new Date(start);
    const e = end instanceof Date ? end : new Date(end);
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || e.getTime() <= s.getTime()) return 0;
    return Math.max(0, Math.floor((e.getTime() - s.getTime()) / 1000));
  }

  /** 解析 JSON 字段 */
  parseSessionConfig(raw: any): Record<string, any> {
    if (!raw) return {};
    if (typeof raw === 'object') return raw as Record<string, any>;
    if (typeof raw === 'string') {
      try {
        const o = JSON.parse(raw);
        return typeof o === 'object' && o ? o : {};
      } catch {
        return {};
      }
    }
    return {};
  }

  private normalizeTeamId(value: any): number | null {
    if (value == null) return null;
    if (typeof value === 'string') {
      const s = value.trim().toLowerCase();
      if (!s || s === 'null' || s === 'undefined') return null;
      const n = Number(s);
      return Number.isFinite(n) && n > 0 ? n : null;
    }
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  private async sendActivityPublishedNotice(
    activityId: number,
    title: string,
    teamId: any,
    bizType: 'activity_published' | 'activity_assigned' = 'activity_published'
  ) {
    const normalizedTeamId = this.normalizeTeamId(teamId);
    await this.messageInfoService.sendSystemToUsers({
      templateKey: 'ACTIVITY_PUBLISHED',
      targetType: normalizedTeamId ? 2 : 0,
      teamId: normalizedTeamId,
      bizType,
      bizId: activityId,
      templateParams: {
        activityId,
        title,
        teamId: normalizedTeamId,
      },
    });
  }

  /**
   * 活动详情（含模板名、团队名，用于编辑回显）
   */
  async getInfoWithJoin(id: number) {
    const row = await this.activityInfoEntity
      .createQueryBuilder('a')
      .leftJoin(ActivityTemplateEntity, 'b', 'a.templateId = b.id')
      .leftJoin(TeamInfoEntity, 'c', 'a.teamId = c.id')
      .select('a.*')
      .addSelect('b.name', 'templateName')
      .addSelect('b.description', 'templateDescription')
      .addSelect('b.icon', 'templateIcon')
      .addSelect('c.name', 'teamName')
      .addSelect('c.type', 'teamType')
      .addSelect('c.memberCount', 'teamMemberCount')
      .where('a.id = :id', { id })
      .getRawOne();
    return row;
  }

  /**
   * 新增活动（override BaseService.add，走 createActivity 校验模板）
   */
  async add(param: any) {
    const creatorId = this.ctx?.admin?.userId ?? param.authorId;
    const {
      templateId,
      title,
      startDate,
      endDate,
      content,
      isTop,
      status,
      teamId,
      checkinMode,
      targetMeditationSeconds,
      passPercent,
      activityType,
      sessionConfig,
    } = param;
    let parsedSession: Record<string, any> | undefined;
    if (sessionConfig != null) {
      parsedSession =
        typeof sessionConfig === 'string'
          ? this.parseSessionConfig(sessionConfig)
          : (sessionConfig as Record<string, any>);
    }
    const publish = Number(status) === 2;
    return this.createActivity(
      creatorId,
      templateId,
      title,
      startDate ? new Date(startDate) : null,
      endDate ? new Date(endDate) : null,
      content ?? '',
      isTop ? 1 : 0,
      publish ? 2 : 1,
      teamId ?? null,
      checkinMode != null ? (Number(checkinMode) === 2 ? 2 : 1) : undefined,
      {
        targetMeditationSeconds:
          targetMeditationSeconds != null ? Number(targetMeditationSeconds) : undefined,
        passPercent: passPercent != null ? Number(passPercent) : undefined,
        activityType: activityType != null ? Number(activityType) : undefined,
        sessionConfig: parsedSession,
      }
    );
  }

  /**
   * 发布活动
   */
  async createActivity(
    creatorId: number,
    templateId: number,
    title: string,
    startDate: Date,
    endDate: Date,
    content: string,
    isTop: number,
    status = 1,
    teamId: number = null,
    checkinMode?: number,
    opts?: {
      targetMeditationSeconds?: number;
      passPercent?: number;
      activityType?: number;
      sessionConfig?: Record<string, any>;
    }
  ) {
    const template = await this.activityTemplateEntity.findOneBy({
      id: templateId,
    });
    if (!template) {
      throw new CoolCommException('模板不存在~');
    }
    const templateDefaultActivityType = Number(template.activityTypeDefault ?? 1) === 2 ? 2 : 1;
    const resolvedActivityType =
      opts?.activityType != null
        ? (Number(opts.activityType) === 2 ? 2 : 1)
        : templateDefaultActivityType;
    const templateDefaultCheckinMode = Number(template.checkinModeDefault ?? 1) === 2 ? 2 : 1;
    const resolvedCheckinMode =
      checkinMode != null ? (Number(checkinMode) === 2 ? 2 : 1) : templateDefaultCheckinMode;
    const row: any = {
      templateId,
      title,
      startDate,
      endDate,
      content,
      isTop: isTop ? 1 : 0,
      authorId: creatorId,
      status: Number(status) === 2 ? 2 : 1,
      teamId: teamId ?? null,
      checkinMode: resolvedCheckinMode,
      activityType: resolvedActivityType,
      groupSessionPhase: 0,
      lockedRosterUserIds: null,
    };
    const targetMeditationSecondsResolved =
      opts?.targetMeditationSeconds != null
        ? Number(opts.targetMeditationSeconds)
        : Number(template.targetMeditationSecondsDefault ?? 0);
    row.targetMeditationSeconds = Math.max(0, Math.floor(targetMeditationSecondsResolved));
    const passPercentResolved =
      opts?.passPercent != null ? Number(opts.passPercent) : Number(template.passPercentDefault ?? 100);
    row.passPercent = Math.min(100, Math.max(0, Math.floor(passPercentResolved)));
    if (row.activityType === 2) {
      if (!row.teamId) {
        throw new CoolCommException('多人共修活动仅支持团队活动');
      }
      const cfg =
        opts?.sessionConfig != null
          ? this.parseSessionConfig(opts.sessionConfig)
          : this.parseSessionConfig(template.sessionConfigDefault);
      const scheduledStartTime = cfg?.scheduledStartTime
        ? new Date(cfg.scheduledStartTime)
        : startDate
          ? new Date(startDate)
          : null;
      if (!scheduledStartTime || Number.isNaN(scheduledStartTime.getTime())) {
        throw new CoolCommException('多人共修需配置 scheduledStartTime');
      }
      const scheduledEndTime = cfg?.scheduledEndTime
        ? new Date(cfg.scheduledEndTime)
        : endDate
          ? new Date(endDate)
          : null;
      if (!scheduledEndTime || Number.isNaN(scheduledEndTime.getTime())) {
        throw new CoolCommException('多人共修需配置 scheduledEndTime');
      }
      if (scheduledEndTime.getTime() <= scheduledStartTime.getTime()) {
        throw new CoolCommException('scheduledEndTime 必须晚于 scheduledStartTime');
      }
      const maxParticipants = Math.max(
        0,
        Math.min(20, Math.floor(Number(cfg?.maxParticipants ?? 20)))
      );
      const rankGraceSeconds = this.getGroupRankGraceSec(cfg);
      row.startDate = scheduledStartTime;
      row.endDate = scheduledEndTime;
      // 多人共修不参与「每日打卡提醒」，语义上固定为「仅一次」；自动打卡事件已排除 activityType=2
      row.checkinMode = 2;
      row.targetMeditationSeconds = this.diffSecondsEndMinusStart(
        scheduledStartTime,
        scheduledEndTime
      );
      row.passPercent = 100;
      row.sessionConfig = {
        startMode: 'scheduled',
        roomNo: cfg?.roomNo ? String(cfg.roomNo) : null,
        scheduledStartTime: this.fmtTs(scheduledStartTime),
        scheduledEndTime: this.fmtTs(scheduledEndTime),
        maxParticipants,
        rankGraceSeconds,
      };
    } else {
      row.sessionConfig =
        opts?.sessionConfig != null
          ? this.parseSessionConfig(opts.sessionConfig)
          : this.parseSessionConfig(template.sessionConfigDefault);
    }
    const saved = await this.activityInfoEntity.save(row);
    const persisted = await this.activityInfoEntity.findOneBy({ id: saved.id });
    if (Number(persisted?.status) === 2) {
      await this.sendActivityPublishedNotice(
        saved.id,
        persisted?.title ?? saved.title,
        persisted?.teamId,
        'activity_published'
      );
    }
    return saved;
  }

  /**
   * App：团队负责人可选用的活动模板（后台标记 allowTeamPublish=是）
   */
  async appTemplateOptions() {
    return this.activityTemplateEntity.find({
      where: { allowTeamPublish: 1 },
      select: [
        'id',
        'name',
        'description',
        'icon',
        'allowTeamPublish',
        'activityTypeDefault',
        'checkinModeDefault',
        'targetMeditationSecondsDefault',
        'passPercentDefault',
        'sessionConfigDefault',
      ],
      order: { id: 'ASC' },
    });
  }

  /**
   * App：团队负责人从模板创建本团队活动（authorId=用户ID，teamId 固定为所管团队）
   */
  async createTeamActivityFromTemplate(userId: number, dto: AppActivityCreateFromTemplateDTO) {
    const teamId = Math.floor(Number(dto.teamId));
    if (!teamId) throw new CoolCommException('团队ID不合法');
    const team = await this.teamInfoEntity.findOneBy({ id: teamId });
    if (!team) throw new CoolCommException('团队不存在~');
    if (team.ownerId !== userId) {
      throw new CoolCommException('仅团队负责人可发起本团队活动~');
    }

    const templateId = Math.floor(Number(dto.templateId));
    const template = await this.activityTemplateEntity.findOneBy({ id: templateId });
    if (!template) throw new CoolCommException('模板不存在~');
    if (Number(template.allowTeamPublish) !== 1) {
      throw new CoolCommException('该模板未开放团队发布~');
    }

    const status = Number(dto.status) === 1 ? 1 : 2;
    const startDate = dto.startDate ? new Date(dto.startDate) : null;
    const endDate = dto.endDate ? new Date(dto.endDate) : null;
    if (status === 2) {
      if (!startDate || !endDate || Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
        throw new CoolCommException('发布活动需填写有效的开始与结束时间~');
      }
      if (endDate.getTime() < startDate.getTime()) {
        throw new CoolCommException('结束时间不能早于开始时间~');
      }
    }

    const title = String(dto.title || '').trim();
    if (!title) throw new CoolCommException('请填写活动标题~');

    const content =
      dto.content != null && String(dto.content).trim()
        ? String(dto.content).trim()
        : String(template.description || '').trim();

    const checkinMode =
      dto.checkinMode != null ? (Number(dto.checkinMode) === 2 ? 2 : 1) : undefined;

    return this.createActivity(
      userId,
      templateId,
      title,
      startDate,
      endDate,
      content,
      0,
      status,
      teamId,
      checkinMode,
      {
        targetMeditationSeconds: dto.targetMeditationSeconds,
        passPercent: dto.passPercent,
        activityType: dto.activityType,
        sessionConfig: dto.sessionConfig,
      }
    );
  }

  /**
   * 分配活动所属团队（仅发布且未过期活动可分配）
   * teamId 为 null 表示全局活动
   */
  async assignTeam(adminId: number, activityId: number, teamId: number | null) {
    const activity = await this.activityInfoEntity.findOneBy({ id: activityId });
    if (!activity) {
      throw new CoolCommException('活动不存在~');
    }
    // 仅发布状态且未过期的活动允许分配团队
    if (activity.status !== 2) {
      throw new CoolCommException('仅发布中的活动可分配团队~');
    }
    if (activity.endDate && activity.endDate < new Date()) {
      throw new CoolCommException('活动已结束，无法分配团队~');
    }
    // teamId 为 null 代表全局活动
    const targetTeamId = this.normalizeTeamId(teamId);
    if (targetTeamId) {
      const team = await this.teamInfoEntity.findOneBy({ id: targetTeamId });
      if (!team) {
        throw new CoolCommException('团队不存在~');
      }
    }
    await this.activityInfoEntity.update(activityId, { teamId: targetTeamId });
    await this.sendActivityPublishedNotice(
      activityId,
      activity.title,
      targetTeamId,
      'activity_assigned'
    );
  }

  /**
   * 编辑活动
   */
  async updateActivity(
    creatorId: number,
    id: number,
    data: Partial<ActivityInfoEntity>,
    options?: { skipAuthorCheck?: boolean }
  ) {
    const activity = await this.activityInfoEntity.findOneBy({ id });
    if (!activity) {
      throw new CoolCommException('活动不存在~');
    }
    if (!options?.skipAuthorCheck && activity.authorId !== creatorId) {
      throw new CoolCommException('无权限编辑~');
    }
    if (activity.endDate && activity.endDate < new Date()) {
      throw new CoolCommException('活动已结束~');
    }
    // 已发布的活动不允许修改模板、团队；仅草稿可改
    if (activity.status === 2) {
      delete data.templateId;
      delete data.teamId;
      // 已发布后锁定活动核心规则，避免影响已参与成员与统计口径
      delete data.activityType;
      delete data.checkinMode;
      delete data.targetMeditationSeconds;
      delete data.passPercent;
      delete data.sessionConfig;
      delete data.startDate;
      delete data.endDate;
    } else {
      if (data.teamId !== undefined) {
        const nextTeamId = this.normalizeTeamId(data.teamId);
        if (nextTeamId) {
          const team = await this.teamInfoEntity.findOneBy({ id: nextTeamId });
          if (!team) {
            throw new CoolCommException('团队不存在~');
          }
          data.teamId = nextTeamId as any;
        } else {
          data.teamId = null;
        }
      }
    }
    if (data.activityType !== undefined && Number(data.activityType) !== 2) {
      data.groupSessionPhase = 0 as any;
      data.lockedRosterUserIds = null as any;
    }
    if (Number(data.activityType ?? activity.activityType) === 2) {
      const teamId = Number(data.teamId ?? activity.teamId);
      if (!teamId) throw new CoolCommException('多人共修活动必须指定团队');
      const cfg = this.parseSessionConfig(data.sessionConfig ?? activity.sessionConfig);
      const start = cfg?.scheduledStartTime
        ? new Date(cfg.scheduledStartTime)
        : (data.startDate as any) ?? activity.startDate;
      const end = cfg?.scheduledEndTime
        ? new Date(cfg.scheduledEndTime)
        : (data.endDate as any) ?? activity.endDate;
      if (!start || !end || Number.isNaN(new Date(start).getTime()) || Number.isNaN(new Date(end).getTime())) {
        throw new CoolCommException('多人共修活动需配置有效开始结束时间');
      }
      // 草稿阶段编辑为多人共修时，与 create 对齐：仅一次；禅修目标秒数 = 计划结束 − 计划开始（墙钟）
      if (activity.status !== 2) {
        (data as any).checkinMode = 2;
        (data as any).targetMeditationSeconds = this.diffSecondsEndMinusStart(start, end);
        (data as any).passPercent = 100;
      }
    }
    await this.activityInfoEntity.update(id, data);

    if (activity.status !== 2 && Number(data.status) === 2) {
      const rawTeam = data.teamId !== undefined ? data.teamId : activity.teamId;
      await this.sendActivityPublishedNotice(
        id,
        data.title ?? activity.title,
        rawTeam,
        'activity_published'
      );
    }
  }

  /**
   * 活动打卡统计（参与人数、今日已打卡人数、打卡明细）
   */
  async getCheckinStats(activityId: number) {
    const rows = await this.activityParticipationEntity
      .createQueryBuilder('p')
      .leftJoin('user_info', 'u', 'p.userId = u.id')
      .where('p.activityId = :activityId', { activityId })
      .select('p.userId', 'userId')
      .addSelect('p.checkins', 'checkins')
      .addSelect('u.nickName', 'userName')
      .getRawMany();

    const today = moment().format('YYYY-MM-DD');
    let todayCheckinCount = 0;
    const checkinList: { userId: number; userName: string; checkinDays: number; todayChecked: boolean }[] = [];

    for (const row of rows) {
      const checkins = Array.isArray(row.checkins) ? row.checkins : [];
      const checkedDays = checkins.filter((d: any) => d?.checked).length;
      const todayChecked = checkins.some((d: any) => d?.date === today && d?.checked);
      if (todayChecked) todayCheckinCount++;
      checkinList.push({
        userId: row.userId,
        userName: row.userName || '-',
        checkinDays: checkedDays,
        todayChecked,
      });
    }

    return {
      totalParticipants: rows.length,
      todayCheckinCount,
      checkinList,
    };
  }

  /**
   * 与 /app/post/feed/teams 一致：可访问团队 ID = 成员表 + firstTeamId 兜底
   */
  private async getUserActivityFeedTeamIds(userId: number): Promise<number[]> {
    const memberships = await this.teamMemberEntity.findBy({ userId });
    let teamIds = memberships.map((m) => m.teamId);
    const user = await this.userInfoEntity.findOneBy({ id: userId });
    if (user?.firstTeamId && !teamIds.includes(user.firstTeamId)) {
      teamIds = [...teamIds, user.firstTeamId];
    }
    return [...new Set(teamIds.filter((id) => Number(id) > 0))];
  }

  /** 团队活动：用户须在可访问团队列表内（与列表 / 动态流一致） */
  private async assertUserCanAccessActivityTeam(
    userId: number,
    teamId: number | null | undefined,
    denyMsg: string
  ) {
    if (!teamId) return;
    const allowed = await this.getUserActivityFeedTeamIds(userId);
    if (!allowed.includes(Number(teamId))) {
      throw new CoolCommException(denyMsg);
    }
  }

  /**
   * App 端活动列表（仅发布状态 + 团队可见性，与 /app/post/feed/teams 对齐）
   * - 仅返回 **当前用户已报名**（activity_participation 有记录）的活动
   * - 未传 teamId：全局活动 + 用户可访问团队下的团队活动（可访问团队 ID 算法与动态流一致）
   * - 传 teamId：全局活动（teamId 为空）+ 该团队活动；须为可访问团队，否则抛错
   * - `includeExpired=1`：包含已过结束时间的活动；默认不含过期项；每项带 `isExpired` 便于前端样式区分
   */
  async appPage(query: any) {
    const page = Math.max(Number(query?.page ?? 1), 1);
    const size = Math.min(Math.max(Number(query?.size ?? 20), 1), 100);
    const userId = this.ctx?.user?.id;
    if (!userId) {
      throw new CoolCommException('请先登录');
    }

    const includeExpired =
      Number(query?.includeExpired) === 1 || query?.includeExpired === true;

    const tidRaw = query?.teamId;
    const tid = tidRaw != null && tidRaw !== '' ? Number(tidRaw) : NaN;
    const scopeTeamId = Number.isFinite(tid) && tid > 0 ? Math.floor(tid) : null;

    if (scopeTeamId) {
      const allowed = await this.getUserActivityFeedTeamIds(userId);
      if (!allowed.includes(scopeTeamId)) {
        throw new CoolCommException('无权查看该团队活动');
      }
    }

    const teamIds = await this.getUserActivityFeedTeamIds(userId);

    const qb = this.activityInfoEntity
      .createQueryBuilder('a')
      .leftJoin('activity_template', 'b', 'a.templateId = b.id')
      .where('a.status = :status', { status: 2 })
      .andWhere(
        `EXISTS (
          SELECT 1 FROM activity_participation p
          WHERE p.activityId = a.id AND p.userId = :participantUserId
            AND (p.status IS NULL OR p.status <> 2)
        )`,
        { participantUserId: userId }
      );

    if (!includeExpired) {
      qb.andWhere('(a.endDate IS NULL OR a.endDate >= :now)', { now: new Date() });
    }

    if (scopeTeamId) {
      qb.andWhere('(a.teamId IS NULL OR a.teamId = :scopeTeamId)', { scopeTeamId });
    } else {
      qb.andWhere(
        teamIds.length > 0
          ? '(a.teamId IS NULL OR a.teamId IN (:...teamIds))'
          : 'a.teamId IS NULL',
        teamIds.length > 0 ? { teamIds } : {}
      );
    }
    qb.select('a.id', 'id')
      .addSelect('a.title', 'title')
      .addSelect('a.startDate', 'startDate')
      .addSelect('a.endDate', 'endDate')
      .addSelect('a.content', 'content')
      .addSelect('a.isTop', 'isTop')
      .addSelect('a.templateId', 'templateId')
      .addSelect('a.teamId', 'teamId')
      .addSelect('a.checkinMode', 'checkinMode')
      .addSelect('a.activityType', 'activityType')
      .addSelect('a.groupSessionPhase', 'groupSessionPhase')
      .addSelect('a.sessionConfig', 'sessionConfig')
      .addSelect('a.targetMeditationSeconds', 'targetMeditationSeconds')
      .addSelect('a.passPercent', 'passPercent')
      .addSelect('b.name', 'templateName')
      .addSelect('b.icon', 'templateIcon')
      .orderBy('a.isTop', 'DESC')
      .addOrderBy('a.createTime', 'DESC');
    const total = await qb.getCount();
    const rawList = await qb
      .offset((page - 1) * size)
      .limit(size)
      .getRawMany();
    const nowMs = Date.now();
    const list = rawList.map((row: any) => {
      const end = row?.endDate ? new Date(row.endDate) : null;
      const isExpired =
        !!(end && !Number.isNaN(end.getTime()) && end.getTime() < nowMs);
      return { ...row, isExpired };
    });
    return { list, pagination: { page: Number(page), size: Number(size), total } };
  }

  /**
   * App 端活动详情（含团队可见性控制）
   */
  async appInfo(id: number) {
    const activity = await this.activityInfoEntity.findOneBy({ id });
    if (!activity) {
      throw new CoolCommException('活动不存在~');
    }
    if (activity.status !== 2) {
      throw new CoolCommException('活动未发布~');
    }
    if (activity.teamId) {
      const userId = this.ctx?.user?.id;
      if (!userId) {
        throw new CoolCommException('仅指定团队成员可查看~');
      }
      await this.assertUserCanAccessActivityTeam(
        userId,
        activity.teamId,
        '仅指定团队成员可查看~'
      );
    }
    const template = await this.activityTemplateEntity.findOneBy({ id: activity.templateId });
    return {
      ...activity,
      templateName: template?.name,
      templateIcon: template?.icon,
    };
  }

  /**
   * 参加活动（含团队专属活动校验）
   */
  async joinActivity(userId: number, activityId: number) {
    const activity = await this.activityInfoEntity.findOneBy({ id: activityId });
    if (!activity) {
      throw new CoolCommException('活动不存在~');
    }
    // 仅发布状态且未过期的活动可参与
    if (activity.status !== 2) {
      throw new CoolCommException('仅发布中的活动可参与~');
    }
    if (activity.endDate && activity.endDate < new Date()) {
      throw new CoolCommException('活动已结束~');
    }
    if (activity.teamId) {
      await this.assertUserCanAccessActivityTeam(
        userId,
        activity.teamId,
        '仅指定团队成员可参与~'
      );
    }

    const exists = await this.activityParticipationEntity.findOneBy({
      userId,
      activityId,
    });
    if (exists) {
      return exists;
    }
    const isGroup = Number(activity.activityType) === 2;
    if (isGroup) {
      const cfg = this.parseSessionConfig(activity.sessionConfig);
      const maxParticipants = Math.max(0, Math.min(20, Number(cfg?.maxParticipants ?? 20)));
      if (maxParticipants > 0) {
        const cnt = await this.activityParticipationEntity.count({
          where: { activityId },
        });
        if (cnt >= maxParticipants) {
          throw new CoolCommException('房间人数已满');
        }
      }
    }
    const result = await this.activityParticipationEntity.save({
      userId,
      activityId,
      applyTime: new Date(),
      checkins: [],
      readyStatus: 0,
      joinTime: new Date(),
      roomRole: userId === activity.authorId ? 2 : 1,
    });

    // 触发活动参与事件
    this.coolEventManager.emit('activityJoined', userId);

    return result;
  }

  private async getGroupActivityForUser(userId: number, activityId: number) {
    const activity = await this.activityInfoEntity.findOneBy({ id: activityId });
    if (!activity) throw new CoolCommException('活动不存在~');
    if (Number(activity.activityType) !== 2) {
      throw new CoolCommException('该活动不是多人共修活动');
    }
    await this.assertUserCanAccessActivityTeam(userId, activity.teamId, '仅指定团队成员可访问~');
    return activity;
  }

  /**
   * 冥想 start 携带 activityId 时：校验可计入本场共修（已发布、进行中、已报名且在锁定名单若有、当前落在排行有效时间窗内）
   */
  async assertGroupMeditationStartAllowed(userId: number, activityId: number) {
    const activity = await this.getGroupActivityForUser(userId, activityId);
    if (Number(activity.status) !== 2) {
      throw new CoolCommException('活动未发布~');
    }
    const phase = Number(activity.groupSessionPhase ?? 0);
    if (phase !== 1) {
      throw new CoolCommException(
        phase === 0 ? '共修尚未开场，请稍后开始冥想' : '本场共修已结束'
      );
    }
    const part = await this.activityParticipationEntity.findOneBy({ userId, activityId });
    if (!part) {
      throw new CoolCommException('请先加入该共修活动');
    }
    const locked = Array.isArray(activity.lockedRosterUserIds) ? activity.lockedRosterUserIds : [];
    if (locked.length) {
      const uid = Number(userId);
      const ok = locked.map((n: any) => Number(n)).some((n: number) => n === uid);
      if (!ok) {
        throw new CoolCommException('您不在本场共修锁定名单中');
      }
    }
    const cfg = this.parseSessionConfig(activity.sessionConfig);
    const startAt = cfg?.scheduledStartTime ? new Date(cfg.scheduledStartTime) : new Date(activity.startDate);
    const endAt = cfg?.scheduledEndTime ? new Date(cfg.scheduledEndTime) : new Date(activity.endDate);
    if (!startAt || !endAt || Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
      throw new CoolCommException('活动时间配置不完整');
    }
    const graceSec = this.getGroupRankGraceSec(cfg);
    const { rankStart, rankEnd } = this.getGroupRankWindowBounds(startAt, endAt, graceSec);
    const now = Date.now();
    if (now < rankStart.getTime() || now > rankEnd.getTime()) {
      throw new CoolCommException('当前不在本场共修有效时间内');
    }
  }

  async setRoomReady(userId: number, activityId: number, ready: boolean) {
    const activity = await this.getGroupActivityForUser(userId, activityId);
    if (Number(activity.groupSessionPhase) !== 0) {
      throw new CoolCommException('活动已开始，不能再修改就绪状态');
    }
    const p = await this.joinActivity(userId, activityId);
    await this.activityParticipationEntity.update((p as any).id, {
      readyStatus: ready ? 1 : 0,
    });
    return { activityId, userId, readyStatus: ready ? 1 : 0 };
  }

  async getRoomState(userId: number, activityId: number) {
    const activity = await this.getGroupActivityForUser(userId, activityId);
    const cfg = this.parseSessionConfig(activity.sessionConfig);
    const rows = await this.activityParticipationEntity
      .createQueryBuilder('p')
      .leftJoin(UserInfoEntity, 'u', 'u.id = p.userId')
      .where('p.activityId = :activityId', { activityId })
      .select(['p.userId as userId', 'p.readyStatus as readyStatus', 'p.roomRole as roomRole', 'u.nickName as nickName', 'u.avatarUrl as avatarUrl'])
      .orderBy('p.readyStatus', 'DESC')
      .addOrderBy('p.id', 'ASC')
      .getRawMany();
    const readyCount = rows.filter((e: any) => Number(e.readyStatus) === 1).length;
    const serverTime = Date.now();
    const phase = Number(activity.groupSessionPhase ?? 0);
    const startAt =
      cfg?.scheduledStartTime != null && cfg?.scheduledStartTime !== ''
        ? new Date(cfg.scheduledStartTime as any)
        : activity.startDate
          ? new Date(activity.startDate)
          : null;
    const endAt =
      cfg?.scheduledEndTime != null && cfg?.scheduledEndTime !== ''
        ? new Date(cfg.scheduledEndTime as any)
        : activity.endDate
          ? new Date(activity.endDate)
          : null;
    const windowOk =
      startAt &&
      endAt &&
      !Number.isNaN(startAt.getTime()) &&
      !Number.isNaN(endAt.getTime()) &&
      endAt.getTime() > startAt.getTime();
    const rankGraceSec = this.getGroupRankGraceSec(cfg);
    let msUntilStart = 0;
    let msUntilEnd = 0;
    let inScheduledWindow = false;
    let suggestStartMeditation = false;
    let suggestStopMeditation = false;
    let suggestPrepareSoon = false;
    if (windowOk) {
      const startMs = startAt!.getTime();
      const endMs = endAt!.getTime();
      msUntilStart = Math.max(0, startMs - serverTime);
      msUntilEnd = Math.max(0, endMs - serverTime);
      const graceMs = rankGraceSec * 1000;
      /** 与排行榜判定一致：允许 grace 秒误差内的「视为在计划窗内」 */
      inScheduledWindow =
        serverTime >= startMs - graceMs && serverTime <= endMs + graceMs;
      /** 进行中且落在计划窗内：可提示用户开始本场共修禅修 */
      suggestStartMeditation = phase === 1 && inScheduledWindow;
      /** 已结算、已过结束时间、或结束前 60 秒内：可提示结束/收尾禅修 */
      suggestStopMeditation =
        phase === 2 ||
        serverTime > endMs ||
        (phase === 1 && inScheduledWindow && msUntilEnd > 0 && msUntilEnd <= 60_000);
      /** 待开场且距离开场 ≤5 分钟：可提示准备 */
      suggestPrepareSoon = phase === 0 && msUntilStart > 0 && msUntilStart <= 5 * 60_000;
    }
    return {
      activityId,
      title: activity.title,
      teamId: activity.teamId,
      phase,
      startAt: cfg?.scheduledStartTime ?? activity.startDate,
      endAt: cfg?.scheduledEndTime ?? activity.endDate,
      maxParticipants: Math.max(0, Math.min(20, Number(cfg?.maxParticipants ?? 20))),
      participantCount: rows.length,
      readyCount,
      participants: rows,
      lockedRosterUserIds: Array.isArray(activity.lockedRosterUserIds) ? activity.lockedRosterUserIds : [],
      serverTime,
      msUntilStart,
      msUntilEnd,
      inScheduledWindow,
      rankGraceSeconds: rankGraceSec,
      suggestStartMeditation,
      suggestStopMeditation,
      suggestPrepareSoon,
    };
  }

  private rankRows(rows: any[], key: string, desc = true) {
    const sorted = [...rows].sort((a, b) => {
      const av = Number(a?.[key] ?? 0);
      const bv = Number(b?.[key] ?? 0);
      if (av !== bv) return desc ? bv - av : av - bv;
      const ae = a?.lastSessionEnd ? new Date(a.lastSessionEnd).getTime() : 0;
      const be = b?.lastSessionEnd ? new Date(b.lastSessionEnd).getTime() : 0;
      if (ae !== be) return be - ae;
      return Number(a.userId) - Number(b.userId);
    });
    return sorted.map((item, idx) => ({ ...item, rank: idx + 1 }));
  }

  async getRoomResult(userId: number, activityId: number) {
    const activity = await this.getGroupActivityForUser(userId, activityId);
    const cfg = this.parseSessionConfig(activity.sessionConfig);
    const startAt = cfg?.scheduledStartTime ? new Date(cfg.scheduledStartTime) : new Date(activity.startDate);
    const endAt = cfg?.scheduledEndTime ? new Date(cfg.scheduledEndTime) : new Date(activity.endDate);
    if (!startAt || !endAt || Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
      throw new CoolCommException('活动时间配置不完整');
    }
    const rankGraceSec = this.getGroupRankGraceSec(cfg);
    const { rankStart, rankEnd } = this.getGroupRankWindowBounds(startAt, endAt, rankGraceSec);
    const roster =
      Array.isArray(activity.lockedRosterUserIds) && activity.lockedRosterUserIds.length
        ? activity.lockedRosterUserIds.map((n: any) => Number(n)).filter((n: number) => n > 0)
        : (
          await this.activityParticipationEntity.find({
            where: { activityId, readyStatus: 1 },
            select: ['userId'],
          })
        ).map(e => Number(e.userId));
    if (!roster.length) {
      return {
        activityId,
        phase: Number(activity.groupSessionPhase ?? 0),
        startAt: this.fmtTs(startAt),
        endAt: this.fmtTs(endAt),
        rankGraceSeconds: rankGraceSec,
        rankWindowStartAt: this.fmtTs(rankStart),
        rankWindowEndAt: this.fmtTs(rankEnd),
        rankings: { avgHeartRate: [], avgBreathRate: [], movementCount: [] },
      };
    }
    /** 共修排行：仅统计 roster；会话整段落在「计划窗 ± rankGraceSeconds」有效边界内；时长为 SUM(totalDuration)；心率/呼吸按 totalDuration 加权，体动为 SUM */
    const sql = `
      SELECT
        s.userId AS userId,
        IFNULL(SUM(r.totalDuration), 0) AS durationSeconds,
        CASE
          WHEN IFNULL(SUM(r.totalDuration), 0) <= 0 THEN 0
          ELSE SUM((IFNULL(r.avgHeartRate, 0) * IFNULL(r.totalDuration, 0))) / SUM(r.totalDuration)
        END AS avgHeartRateWeighted,
        CASE
          WHEN IFNULL(SUM(r.totalDuration), 0) <= 0 THEN 0
          ELSE SUM((IFNULL(r.avgBreathRate, 0) * IFNULL(r.totalDuration, 0))) / SUM(r.totalDuration)
        END AS avgBreathRateWeighted,
        IFNULL(SUM(r.movementCount), 0) AS movementCount,
        MAX(s.endDate) AS lastSessionEnd
      FROM meditation_report r
      INNER JOIN meditation_session s ON s.id = r.sessionId
      WHERE s.status = 2
        AND s.userId IN (${roster.map(() => '?').join(',')})
        AND s.startDate IS NOT NULL
        AND s.endDate IS NOT NULL
        AND s.startDate >= ?
        AND s.endDate <= ?
      GROUP BY s.userId
    `;
    const rows: any[] = await this.meditationReportEntity.manager.query(sql, [
      ...roster,
      this.fmtTs(rankStart),
      this.fmtTs(rankEnd),
    ]);
    const byUser = new Map<number, any>();
    for (const row of rows) byUser.set(Number(row.userId), row);
    const users = await this.userInfoEntity.find({
      where: roster.map(id => ({ id })) as any,
      select: ['id', 'nickName', 'avatarUrl'],
    });
    const userMap = new Map(users.map(u => [Number(u.id), u]));
    const fullRows = roster.map(uid => {
      const row = byUser.get(uid) || {};
      return {
        userId: uid,
        nickName: userMap.get(uid)?.nickName || '-',
        avatarUrl: userMap.get(uid)?.avatarUrl || null,
        durationSeconds: Number(row.durationSeconds ?? 0),
        avgHeartRateWeighted: Number(Number(row.avgHeartRateWeighted ?? 0).toFixed(2)),
        avgBreathRateWeighted: Number(Number(row.avgBreathRateWeighted ?? 0).toFixed(2)),
        movementCount: Number(row.movementCount ?? 0),
        lastSessionEnd: row.lastSessionEnd || null,
      };
    });
    return {
      activityId,
      phase: Number(activity.groupSessionPhase ?? 0),
      startAt: this.fmtTs(startAt),
      endAt: this.fmtTs(endAt),
      rankGraceSeconds: rankGraceSec,
      rankWindowStartAt: this.fmtTs(rankStart),
      rankWindowEndAt: this.fmtTs(rankEnd),
      rosterUserIds: roster,
      rankings: {
        avgHeartRate: this.rankRows(fullRows, 'avgHeartRateWeighted', true),
        avgBreathRate: this.rankRows(fullRows, 'avgBreathRateWeighted', true),
        /** 体动次数越少越好（升序排行） */
        movementCount: this.rankRows(fullRows, 'movementCount', false),
      },
    };
  }

  async runGroupSessionScheduler() {
    await this.startDueGroupSessions();
    await this.finishDueGroupSessions();
  }

  async startDueGroupSessions() {
    const now = new Date();
    const rows = await this.activityInfoEntity
      .createQueryBuilder('a')
      .where('a.status = 2')
      .andWhere('a.activityType = 2')
      .andWhere('a.groupSessionPhase = 0')
      .andWhere('a.startDate IS NOT NULL AND a.startDate <= :now', { now })
      .getMany();
    for (const a of rows) {
      const ps = await this.activityParticipationEntity.find({
        where: { activityId: a.id, readyStatus: 1 },
        select: ['userId'],
      });
      const roster = ps.map(e => Number(e.userId)).filter(n => n > 0);
      await this.activityInfoEntity.update(a.id, {
        groupSessionPhase: 1,
        lockedRosterUserIds: roster,
      });
    }
  }

  async finishDueGroupSessions() {
    const now = new Date();
    const rows = await this.activityInfoEntity
      .createQueryBuilder('a')
      .where('a.status = 2')
      .andWhere('a.activityType = 2')
      .andWhere('a.groupSessionPhase = 1')
      .andWhere('a.endDate IS NOT NULL AND a.endDate <= :now', { now })
      .getMany();
    for (const a of rows) {
      // 保持与项目既有活动通知链路一致：
      // 仅发布/分配团队时发送 ACTIVITY_PUBLISHED 通知；
      // 多人共修结束只切换阶段，不额外发送结束通知。
      await this.activityInfoEntity.update(a.id, { groupSessionPhase: 2 });
    }
  }

  /**
   * 活动打卡
   */
  async checkinActivity(
    userId: number,
    activityId: number,
    payload?: any,
    source: number = 1
  ) {
    const activity = await this.activityInfoEntity.findOneBy({ id: activityId });
    if (!activity) {
      throw new CoolCommException('活动不存在~');
    }
    if (activity.status !== 2) {
      throw new CoolCommException('仅发布中的活动可打卡~');
    }
    if (Number(activity.activityType) === 2) {
      throw new CoolCommException('多人共修活动不支持手动打卡');
    }
    if (activity.startDate && activity.startDate > new Date()) {
      throw new CoolCommException('活动未开始~');
    }
    if (activity.endDate && activity.endDate < new Date()) {
      throw new CoolCommException('活动已结束~');
    }
    if (activity.teamId) {
      await this.assertUserCanAccessActivityTeam(
        userId,
        activity.teamId,
        '仅指定团队成员可打卡~'
      );
    }

    const participation = await this.activityParticipationEntity.findOneBy({
      userId,
      activityId,
    });
    if (!participation) {
      throw new CoolCommException('请先报名活动再打卡~');
    }

    const ctxHasHeaders = !!this.ctx?.request?.headers;
    const ipRaw = ctxHasHeaders ? await this.utils.getReqIP(this.ctx) : '';
    const ip = String(ipRaw ?? '').split(',')[0].trim();
    const uaRaw = ctxHasHeaders ? this.ctx?.get?.('user-agent') : '';
    const ua = String(uaRaw ?? '');

    const checkinMode = Number(activity.checkinMode) || 1;
    const lat = payload?.lat != null ? Number(payload.lat) : null;
    const lng = payload?.lng != null ? Number(payload.lng) : null;
    const accuracy = payload?.accuracy != null ? Number(payload.accuracy) : null;
    let province = payload?.province ?? null;
    let city = payload?.city ?? null;

    let distanceM: number = null;
    try {
      if ((province == null || city == null) && lat != null && lng != null) {
        try {
          const geo = await this.geoService.reverseGeocode(lat, lng);
          if (geo?.province && province == null) province = geo.province;
          if (geo?.city && city == null) city = geo.city;
        } catch {}
      }

      if (checkinMode === 2) {
        const existsChecked =
          Array.isArray(participation.checkins) &&
          participation.checkins.some((d: any) => d?.checked);
        if (existsChecked) {
          if (Number(source) === 2) return;
          throw new CoolCommException('该活动仅需打卡一次，已完成打卡~');
        }
      }

      const today = moment().format('YYYY-MM-DD');
      const checkins = Array.isArray(participation.checkins) ? [...participation.checkins] : [];
      const idx = checkins.findIndex((d: any) => d?.date === today);
      if (idx >= 0 && checkins[idx]?.checked) {
        if (Number(source) === 2) return;
        checkins[idx] = { ...checkins[idx], checked: true, time: new Date(), source };
        await this.activityParticipationEntity.update(participation.id, { checkins });
        return;
      }
      if (idx >= 0) {
        checkins[idx] = { ...checkins[idx], checked: true, time: new Date(), source };
      } else {
        checkins.push({ date: today, checked: true, time: new Date(), source });
      }

      const checkinTime = new Date();
      await this.activityParticipationEntity.manager.transaction(async manager => {
        await manager.update(ActivityParticipationEntity, participation.id, { checkins });
        await manager.save(ActivityCheckinLogEntity, {
          userId,
          activityId,
          checkinTime,
          lat: lat != null ? String(lat) : null,
          lng: lng != null ? String(lng) : null,
          accuracy,
          distanceM,
          result: 1,
          source: Number(source) === 2 ? 2 : 1,
          reason: null,
          ip,
          ua,
          province,
          city,
        });
      });
      if (province || city) {
        const update: any = { lastLocationTime: new Date() };
        if (province) update.lastProvince = province;
        if (city) update.lastCity = city;
        await this.userInfoEntity.update(userId, update);
      }
      return;
    } catch (e: any) {
      const reason = e?.message ? String(e.message) : 'checkin_failed';
      await this.activityCheckinLogEntity.save({
        userId,
        activityId,
        checkinTime: new Date(),
        lat: lat != null ? String(lat) : null,
        lng: lng != null ? String(lng) : null,
        accuracy,
        distanceM,
        result: 0,
        source: Number(source) === 2 ? 2 : 1,
        reason,
        ip,
        ua,
        province,
        city,
      });
      throw e;
    }
  }

  /**
   * 每日打卡检查（仅针对发布中且未结束的团队专属活动，未打卡成员推送提醒）
   */
  async checkDailyCheckin() {
    const today = moment().format('YYYY-MM-DD');
    const now = new Date();
    // 仅统计：status=2、未结束、团队专属活动 的参与记录（未打卡用户仅限指定团队成员）
    const rows = await this.activityParticipationEntity
      .createQueryBuilder('p')
      .innerJoin(ActivityInfoEntity, 'a', 'p.activityId = a.id')
      .where('a.status = :status', { status: 2 })
      .andWhere('(a.startDate IS NULL OR a.startDate <= :now)', { now })
      .andWhere('(a.endDate IS NULL OR a.endDate >= :now)', { now })
      .andWhere('a.checkinMode = :checkinMode', { checkinMode: 1 })
      .andWhere('(a.activityType IS NULL OR a.activityType <> 2)')
      .andWhere('a.teamId IS NOT NULL')
      .select('p.userId', 'userId')
      .addSelect('p.activityId', 'activityId')
      .addSelect('p.checkins', 'checkins')
      .addSelect('a.title', 'activityTitle')
      .addSelect('a.teamId', 'teamId')
      .getRawMany();

    const groups = new Map<
      number,
      { activityId: number; activityTitle: string; teamId: number; userIds: number[] }
    >();
    for (const row of rows) {
      const checkins = Array.isArray(row.checkins) ? row.checkins : [];
      const hasToday = checkins.some((d: any) => d?.date === today && d?.checked);
      if (!hasToday) {
        const aid = Number(row.activityId);
        const uid = Number(row.userId);
        if (aid > 0 && uid > 0) {
          const g =
            groups.get(aid) ??
            {
              activityId: aid,
              activityTitle: row.activityTitle,
              teamId: Number(row.teamId) || null,
              userIds: [],
            };
          g.userIds.push(uid);
          groups.set(aid, g);
        }
      }
    }

    for (const g of groups.values()) {
      this.coolEventManager.emit('activityCheckinReminder', g);
    }
  }
}
