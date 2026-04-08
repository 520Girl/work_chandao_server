
import { ILogger, Logger, Provide } from '@midwayjs/core';
import { BaseService, CoolCommException, CoolEventManager } from '@cool-midway/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityInfoEntity } from '../entity/info';
import { ActivityParticipationEntity } from '../entity/participation';
import { ActivityTemplateEntity } from '../entity/template';
import { TeamInfoEntity } from '../../team/entity/info';
import { TeamMemberEntity } from '../../team/entity/member';
import { Inject } from '@midwayjs/core';
import { MessageInfoService } from '../../message/service/info';

/**
 * 活动服务
 */
@Provide()
export class ActivityInfoService extends BaseService {
  @InjectEntityModel(ActivityInfoEntity)
  activityInfoEntity: Repository<ActivityInfoEntity>;

  @InjectEntityModel(ActivityParticipationEntity)
  activityParticipationEntity: Repository<ActivityParticipationEntity>;

  @InjectEntityModel(ActivityTemplateEntity)
  activityTemplateEntity: Repository<ActivityTemplateEntity>;

  @InjectEntityModel(TeamMemberEntity)
  teamMemberEntity: Repository<TeamMemberEntity>;

  @InjectEntityModel(TeamInfoEntity)
  teamInfoEntity: Repository<TeamInfoEntity>;

  @Logger()
  logger: ILogger;

  @Inject()
  coolEventManager: CoolEventManager;

  @Inject()
  ctx;

  @Inject()
  messageInfoService: MessageInfoService;

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
    } = param;
    return this.createActivity(
      creatorId,
      templateId,
      title,
      startDate ? new Date(startDate) : null,
      endDate ? new Date(endDate) : null,
      content ?? '',
      isTop ? 1 : 0,
      status === 2 ? 2 : 1,
      teamId ?? null,
      Number(checkinMode) === 2 ? 2 : 1
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
    checkinMode: number = 1
  ) {
    const template = await this.activityTemplateEntity.findOneBy({
      id: templateId,
    });
    if (!template) {
      throw new CoolCommException('模板不存在~');
    }
    const saved = await this.activityInfoEntity.save({
      templateId,
      title,
      startDate,
      endDate,
      content,
      isTop: isTop ? 1 : 0,
      authorId: creatorId,
      status: status === 2 ? 2 : 1,
      teamId: teamId ?? null,
      checkinMode: Number(checkinMode) === 2 ? 2 : 1,
    });
    if (saved.status === 2 && saved.teamId) {
      await this.messageInfoService.sendSystemToUsers({
        templateKey: 'ACTIVITY_PUBLISHED',
        targetType: 2,
        teamId: saved.teamId,
        bizType: 'activity_published',
        bizId: saved.id,
        templateParams: { activityId: saved.id, title: saved.title, teamId: saved.teamId },
      });
    }
    return saved;
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
    let targetTeamId: number = null;
    if (teamId) {
      const memberRepo = this.teamMemberEntity;
      // 只校验团队是否存在成员记录即可，避免额外依赖
      const anyMember = await memberRepo.findOneBy({ teamId });
      if (!anyMember) {
        throw new CoolCommException('团队不存在或暂无成员~');
      }
      targetTeamId = teamId;
    }
    await this.activityInfoEntity.update(activityId, { teamId: targetTeamId });
    if (targetTeamId) {
      await this.messageInfoService.sendSystemToUsers({
        templateKey: 'ACTIVITY_PUBLISHED',
        targetType: 2,
        teamId: targetTeamId,
        bizType: 'activity_assigned',
        bizId: activityId,
        templateParams: { activityId: activityId, title: activity.title, teamId: targetTeamId },
      });
    }
  }

  /**
   * 编辑活动
   */
  async updateActivity(
    creatorId: number,
    id: number,
    data: Partial<ActivityInfoEntity>
  ) {
    const activity = await this.activityInfoEntity.findOneBy({ id });
    if (!activity) {
      throw new CoolCommException('活动不存在~');
    }
    if (activity.authorId !== creatorId) {
      throw new CoolCommException('无权限编辑~');
    }
    if (activity.endDate && activity.endDate < new Date()) {
      throw new CoolCommException('活动已结束~');
    }
    // 已发布的活动不允许修改模板、团队；仅草稿可改
    if (activity.status === 2) {
      delete data.templateId;
      delete data.teamId;
    } else {
      if (data.teamId !== undefined) {
        if (data.teamId) {
          const anyMember = await this.teamMemberEntity.findOneBy({ teamId: data.teamId });
          if (!anyMember) {
            throw new CoolCommException('团队不存在或暂无成员~');
          }
        } else {
          data.teamId = null;
        }
      }
    }
    await this.activityInfoEntity.update(id, data);

    if (activity.status !== 2 && data.status === 2) {
      const nextTeamId = (data.teamId !== undefined ? data.teamId : activity.teamId) ?? null;
      if (nextTeamId) {
        await this.messageInfoService.sendSystemToUsers({
          templateKey: 'ACTIVITY_PUBLISHED',
          targetType: 2,
          teamId: nextTeamId,
          bizType: 'activity_published',
          bizId: id,
          templateParams: { activityId: id, title: data.title ?? activity.title, teamId: nextTeamId },
        });
      }
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

    const today = new Date().toISOString().slice(0, 10);
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
   * App 端活动列表（仅发布状态 + 团队可见性控制）
   */
  async appPage(query: any) {
    const { page = 1, size = 20 } = query;
    const userId = this.ctx?.user?.id;

    // 计算用户所属团队列表
    let teamIds: number[] = [];
    if (userId) {
      const memberships = await this.teamMemberEntity.findBy({ userId });
      teamIds = memberships.map((m) => m.teamId);
    }
    const qb = this.activityInfoEntity
      .createQueryBuilder('a')
      .leftJoin('activity_template', 'b', 'a.templateId = b.id')
      .where('a.status = :status', { status: 2 })
      .andWhere('(a.endDate IS NULL OR a.endDate >= :now)', { now: new Date() })
      // 全局活动（teamId IS NULL）对所有人可见；团队活动仅团队成员可见
      .andWhere(
        teamIds.length > 0
          ? '(a.teamId IS NULL OR a.teamId IN (:...teamIds))'
          : 'a.teamId IS NULL',
        teamIds.length > 0 ? { teamIds } : {}
      )
      .select([
        'a.id',
        'a.title',
        'a.startDate',
        'a.endDate',
        'a.content',
        'a.isTop',
        'a.templateId',
        'a.teamId',
        'a.checkinMode',
      ])
      .addSelect('b.name', 'templateName')
      .addSelect('b.icon', 'templateIcon')
      .orderBy('a.isTop', 'DESC')
      .addOrderBy('a.createTime', 'DESC');
    const total = await qb.getCount();
    const list = await qb
      .offset((page - 1) * size)
      .limit(size)
      .getRawMany();
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
    // 团队专属活动仅团队成员可见
    if (activity.teamId) {
      const userId = this.ctx?.user?.id;
      if (!userId) {
        throw new CoolCommException('仅指定团队成员可查看~');
      }
      const membership = await this.teamMemberEntity.findOneBy({
        userId,
        teamId: activity.teamId,
      });
      if (!membership) {
        throw new CoolCommException('仅指定团队成员可查看~');
      }
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
    // 团队专属活动仅团队成员可参与
    if (activity.teamId) {
      const membership = await this.teamMemberEntity.findOneBy({
        userId,
        teamId: activity.teamId,
      });
      if (!membership) {
        throw new CoolCommException('仅指定团队成员可参与~');
      }
    }

    const exists = await this.activityParticipationEntity.findOneBy({
      userId,
      activityId,
    });
    if (exists) {
      return exists;
    }
    const result = await this.activityParticipationEntity.save({
      userId,
      activityId,
      applyTime: new Date(),
      checkins: [],
    });

    // 触发活动参与事件
    this.coolEventManager.emit('activityJoined', userId);

    return result;
  }

  /**
   * 活动打卡
   */
  async checkinActivity(userId: number, activityId: number) {
    const activity = await this.activityInfoEntity.findOneBy({ id: activityId });
    if (!activity) {
      throw new CoolCommException('活动不存在~');
    }
    if (activity.status !== 2) {
      throw new CoolCommException('仅发布中的活动可打卡~');
    }
    if (activity.startDate && activity.startDate > new Date()) {
      throw new CoolCommException('活动未开始~');
    }
    if (activity.endDate && activity.endDate < new Date()) {
      throw new CoolCommException('活动已结束~');
    }
    // 团队专属活动仅团队成员可打卡
    if (activity.teamId) {
      const membership = await this.teamMemberEntity.findOneBy({
        userId,
        teamId: activity.teamId,
      });
      if (!membership) {
        throw new CoolCommException('仅指定团队成员可打卡~');
      }
    }

    const participation = await this.activityParticipationEntity.findOneBy({
      userId,
      activityId,
    });
    if (!participation) {
      throw new CoolCommException('请先报名活动再打卡~');
    }

    const checkinMode = Number(activity.checkinMode) || 1;
    if (checkinMode === 2) {
      const existsChecked =
        Array.isArray(participation.checkins) &&
        participation.checkins.some((d: any) => d?.checked);
      if (existsChecked) {
        throw new CoolCommException('该活动仅需打卡一次，已完成打卡~');
      }
    }

    const today = new Date().toISOString().slice(0, 10);
    const checkins = Array.isArray(participation.checkins)
      ? [...participation.checkins]
      : [];
    const idx = checkins.findIndex((d: any) => d?.date === today);
    if (idx >= 0) {
      checkins[idx] = { ...checkins[idx], checked: true, time: new Date() };
    } else {
      checkins.push({ date: today, checked: true, time: new Date() });
    }

    await this.activityParticipationEntity.update(participation.id, {
      checkins,
    });
  }

  /**
   * 每日打卡检查（仅针对发布中且未结束的团队专属活动，未打卡成员推送提醒）
   */
  async checkDailyCheckin() {
    const today = new Date().toISOString().slice(0, 10);
    const now = new Date();
    // 仅统计：status=2、未结束、团队专属活动 的参与记录（未打卡用户仅限指定团队成员）
    const rows = await this.activityParticipationEntity
      .createQueryBuilder('p')
      .innerJoin(ActivityInfoEntity, 'a', 'p.activityId = a.id')
      .where('a.status = :status', { status: 2 })
      .andWhere('(a.startDate IS NULL OR a.startDate <= :now)', { now })
      .andWhere('(a.endDate IS NULL OR a.endDate >= :now)', { now })
      .andWhere('a.checkinMode = :checkinMode', { checkinMode: 1 })
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
