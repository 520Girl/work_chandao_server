import { Provide } from '@midwayjs/core';
import { BaseService } from '@cool-midway/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import { MessageInfoEntity } from '../entity/info';
import { MessageUserEntity } from '../entity/user';
import { MessageTemplateEntity } from '../entity/template';
import { TeamMemberEntity } from '../../team/entity/member';
import { TeamInfoEntity } from '../../team/entity/info';
import { UserInfoEntity } from '../../user/entity/info';
import { In } from 'typeorm';
import { MessageDeliveryFailEntity } from '../entity/delivery_fail';

@Provide()
export class MessageInfoService extends BaseService {
  @InjectEntityModel(MessageInfoEntity)
  messageInfoEntity: Repository<MessageInfoEntity>;

  @InjectEntityModel(MessageUserEntity)
  messageUserEntity: Repository<MessageUserEntity>;

  @InjectEntityModel(MessageTemplateEntity)
  messageTemplateEntity: Repository<MessageTemplateEntity>;

  @InjectEntityModel(TeamMemberEntity)
  teamMemberEntity: Repository<TeamMemberEntity>;

  @InjectEntityModel(TeamInfoEntity)
  teamInfoEntity: Repository<TeamInfoEntity>;

  @InjectEntityModel(UserInfoEntity)
  userInfoEntity: Repository<UserInfoEntity>;

  @InjectEntityModel(MessageDeliveryFailEntity)
  messageDeliveryFailEntity: Repository<MessageDeliveryFailEntity>;

  private renderStr(tpl: any, params: any) {
    if (!tpl || typeof tpl !== 'string') return tpl;
    return tpl.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key) => {
      const keys = String(key).split('.');
      let cur = params;
      for (const k of keys) {
        if (cur && typeof cur === 'object' && k in cur) cur = cur[k];
        else return '';
      }
      return cur == null ? '' : String(cur);
    });
  }

  private renderAny(obj: any, params: any) {
    if (obj == null) return obj;
    if (typeof obj === 'string') return this.renderStr(obj, params);
    if (Array.isArray(obj)) return obj.map(v => this.renderAny(v, params));
    if (typeof obj === 'object') {
      const out: any = {};
      for (const k of Object.keys(obj)) out[k] = this.renderAny(obj[k], params);
      return out;
    }
    return obj;
  }

  private normalizeJson(value: any): any {
    if (value == null) return null;
    if (typeof value === 'string') return value;
    try {
      return JSON.stringify(value);
    } catch (e) {
      return String(value);
    }
  }

  private async resolveUserIdsByTarget(param: any): Promise<number[]> {
    const targetType = Number(param?.targetType) || 0;
    if (targetType === 1) {
      const userIds = Array.isArray(param?.userIds) ? param.userIds : [];
      return userIds.map((v: any) => Number(v)).filter((v: any) => v > 0);
    }
    if (targetType === 2) {
      const teamId = Number(param?.teamId) || 0;
      if (!teamId) return [];
      const members = await this.teamMemberEntity.findBy({ teamId, exitType: 0 });
      return members.map(m => m.userId);
    }
    if (targetType === 3) {
      const teamId = Number(param?.teamId) || 0;
      if (!teamId) return [];
      const team = await this.teamInfoEntity.findOneBy({ id: teamId });
      return team?.ownerId ? [team.ownerId] : [];
    }
    return [];
  }

  private async resolveDelivery(param: any): Promise<{ userIds: number[]; failUserIds: number[] }> {
    const targetType = Number(param?.targetType) || 0;
    const userIds = await this.resolveUserIdsByTarget(param);

    if (targetType === 1) {
      const ids = Array.from(new Set(userIds));
      if (!ids.length) return { userIds: [], failUserIds: [] };
      const exists = await this.userInfoEntity.find({
        where: { id: In(ids as any) } as any,
        select: ['id'] as any,
      });
      const existIds = exists.map(u => u.id);
      const existSet = new Set(existIds);
      const failUserIds = ids.filter(id => !existSet.has(id));
      return { userIds: existIds, failUserIds };
    }

    return { userIds, failUserIds: [] };
  }

  private async recordFail(messageId: number, userIds: number[], reason: string) {
    const ids = Array.from(new Set((userIds ?? []).map(v => Number(v)).filter(v => v > 0)));
    if (!ids.length) return;
    const rows = ids.map(userId => ({
      messageId,
      userId,
      reason,
    }));
    await this.messageDeliveryFailEntity.insert(rows as any);
  }

  private async deliverToUsers(messageId: number, userIds: number[]) {
    const ids = Array.from(new Set((userIds ?? []).map(v => Number(v)).filter(v => v > 0)));
    if (!ids.length) return;
    const rows = ids.map(userId => ({
      messageId,
      userId,
      readStatus: 0,
      readTime: null,
      deleteStatus: 0,
      deleteTime: null,
    }));
    await this.messageUserEntity
      .createQueryBuilder()
      .insert()
      .values(rows as any)
      .orIgnore()
      .execute();
  }

  async add(param: any) {
    const params = param?.templateParams ?? param ?? {};
    const creatorId = this.getUserId('admin');

    const data: any = { ...(param ?? {}) };
    data.targetType = Number(data.targetType) || 0;
    data.teamId = data.teamId != null ? Number(data.teamId) || null : null;
    data.contentType = Number(data.contentType) || 0;
    data.creatorId = creatorId ?? null;
    data.senderType = creatorId ? 1 : 0;
    data.senderId = creatorId ?? null;
    data.sendTime = new Date();

    if (data.templateKey) {
      const tpl = await this.messageTemplateEntity.findOneBy({ keyName: data.templateKey });
      if (tpl && tpl.enabled === 1) {
        data.title = this.renderStr(tpl.titleTpl || data.title, params);
        data.content = this.renderStr(tpl.contentTpl || data.content, params);
        data.contentType = tpl.contentType ?? data.contentType;
        data.contentData = this.renderAny(tpl.contentDataTpl, params) ?? data.contentData;
      }
    }

    const delivery = await this.resolveDelivery(data);
    const msg = await this.messageInfoEntity.save({
      title: data.title,
      content: data.content,
      contentType: data.contentType,
      contentData: this.normalizeJson(data.contentData),
      templateKey: data.templateKey ?? null,
      bizType: data.bizType ?? null,
      bizId: data.bizId ?? null,
      targetType: data.targetType,
      teamId: data.teamId ?? null,
      senderType: data.senderType,
      senderId: data.senderId ?? null,
      sendTime: data.sendTime,
      creatorId: data.creatorId,
    });

    if (data.targetType !== 0) {
      await this.deliverToUsers(msg.id, delivery.userIds);
      if (data.targetType === 1 && delivery.failUserIds.length) {
        await this.recordFail(msg.id, delivery.failUserIds, 'user_not_found');
      }
    }

    return msg;
  }

  async sendSystemToUsers(param: {
    title?: string;
    content?: string;
    contentType?: number;
    contentData?: any;
    templateKey?: string;
    templateParams?: any;
    bizType?: string;
    bizId?: number;
    targetType?: number;
    teamId?: number;
    userIds?: number[];
  }) {
    const msg = await this.messageInfoEntity.save({
      title: param?.title ?? '',
      content: param?.content ?? null,
      contentType: Number(param?.contentType) || 0,
      contentData: this.normalizeJson(param?.contentData),
      templateKey: param?.templateKey ?? null,
      bizType: param?.bizType ?? null,
      bizId: param?.bizId ?? null,
      targetType: Number(param?.targetType) || 1,
      teamId: param?.teamId ?? null,
      senderType: 0,
      senderId: null,
      sendTime: new Date(),
      creatorId: null,
    });

    const params = param?.templateParams ?? param ?? {};
    if (msg.templateKey) {
      const tpl = await this.messageTemplateEntity.findOneBy({ keyName: msg.templateKey });
      if (tpl && tpl.enabled === 1) {
        await this.messageInfoEntity.update(msg.id, {
          title: this.renderStr(tpl.titleTpl || msg.title, params),
          content: this.renderStr(tpl.contentTpl || msg.content, params),
          contentType: tpl.contentType ?? msg.contentType,
          contentData: this.normalizeJson(this.renderAny(tpl.contentDataTpl, params) ?? msg.contentData),
        });
      }
    }

    if ((Number(param?.targetType) || 1) !== 0) {
      const delivery = await this.resolveDelivery(param);
      await this.deliverToUsers(msg.id, delivery.userIds);
      if ((Number(param?.targetType) || 1) === 1 && delivery.failUserIds.length) {
        await this.recordFail(msg.id, delivery.failUserIds, 'user_not_found');
      }
    }

    return msg;
  }

  async pageForUser(userId: number, query: { page?: number; size?: number; readStatus?: number }) {
    const page = Number(query?.page) > 0 ? Number(query.page) : 1;
    const size = Number(query?.size) > 0 ? Number(query.size) : 20;
    const readStatus = query?.readStatus == null ? null : Number(query.readStatus);

    const qb = this.messageInfoEntity
      .createQueryBuilder('m')
      .leftJoin(MessageUserEntity, 'mu', 'mu.messageId = m.id AND mu.userId = :userId', { userId })
      .where('(m.targetType = 0 OR mu.userId = :userId)', { userId })
      .andWhere('(mu.deleteStatus IS NULL OR mu.deleteStatus = 0)');

    if (readStatus === 0) {
      qb.andWhere(
        '((m.targetType = 0 AND (mu.id IS NULL OR mu.readStatus = 0)) OR (m.targetType != 0 AND mu.readStatus = 0))'
      );
    }
    if (readStatus === 1) {
      qb.andWhere('mu.readStatus = 1');
    }

    qb.select([
      'm.id as id',
      'm.title as title',
      'm.content as content',
      'm.contentType as contentType',
      'm.contentData as contentData',
      'm.templateKey as templateKey',
      'm.bizType as bizType',
      'm.bizId as bizId',
      'm.targetType as targetType',
      'm.teamId as teamId',
      'm.sendTime as sendTime',
      'm.createTime as createTime',
      'mu.readStatus as readStatus',
      'mu.readTime as readTime',
    ])
      .orderBy('m.id', 'DESC')
      .offset((page - 1) * size)
      .limit(size);

    const list = (await qb.getRawMany()).map((row: any) => {
      if (row && typeof row.contentData === 'string') {
        try {
          row.contentData = JSON.parse(row.contentData);
        } catch (e) {}
      }
      if (row && row.readStatus == null) row.readStatus = 0;
      return row;
    });

    const countQb = this.messageInfoEntity
      .createQueryBuilder('m')
      .leftJoin(MessageUserEntity, 'mu', 'mu.messageId = m.id AND mu.userId = :userId', { userId })
      .where('(m.targetType = 0 OR mu.userId = :userId)', { userId })
      .andWhere('(mu.deleteStatus IS NULL OR mu.deleteStatus = 0)');
    if (readStatus === 0) {
      countQb.andWhere(
        '((m.targetType = 0 AND (mu.id IS NULL OR mu.readStatus = 0)) OR (m.targetType != 0 AND mu.readStatus = 0))'
      );
    }
    if (readStatus === 1) {
      countQb.andWhere('mu.readStatus = 1');
    }
    const total = await countQb.getCount();

    return {
      list,
      pagination: { page, size, total },
    };
  }

  async unreadCount(userId: number) {
    const qb = this.messageInfoEntity
      .createQueryBuilder('m')
      .leftJoin(MessageUserEntity, 'mu', 'mu.messageId = m.id AND mu.userId = :userId', { userId })
      .where('(m.targetType = 0 OR mu.userId = :userId)', { userId })
      .andWhere('(mu.deleteStatus IS NULL OR mu.deleteStatus = 0)')
      .andWhere('((m.targetType = 0 AND (mu.id IS NULL OR mu.readStatus = 0)) OR (m.targetType != 0 AND mu.readStatus = 0))');
    return await qb.getCount();
  }

  async markRead(userId: number, messageId: number) {
    const exists = await this.messageUserEntity.findOne({ where: { userId, messageId } });
    if (exists) {
      if (exists.readStatus !== 1) {
        exists.readStatus = 1;
        exists.readTime = new Date();
        await this.messageUserEntity.save(exists);
      }
      return;
    }
    await this.messageUserEntity.save({
      userId,
      messageId,
      readStatus: 1,
      readTime: new Date(),
      deleteStatus: 0,
      deleteTime: null,
    } as any);
  }

  async deleteForUser(userId: number, messageId: number) {
    const exists = await this.messageUserEntity.findOne({ where: { userId, messageId } });
    if (exists) {
      if (exists.deleteStatus !== 1) {
        exists.deleteStatus = 1;
        exists.deleteTime = new Date();
        await this.messageUserEntity.save(exists);
      }
      return;
    }
    await this.messageUserEntity.save({
      userId,
      messageId,
      readStatus: 0,
      readTime: null,
      deleteStatus: 1,
      deleteTime: new Date(),
    } as any);
  }

  async deliveryPage(param: {
    messageId: number;
    page?: number;
    size?: number;
    readStatus?: number;
    deleteStatus?: number;
  }) {
    const messageId = Number(param?.messageId);
    const page = Number(param?.page) > 0 ? Number(param.page) : 1;
    const size = Number(param?.size) > 0 ? Number(param.size) : 20;
    const readStatus = param?.readStatus == null ? null : Number(param.readStatus);
    const deleteStatus = param?.deleteStatus == null ? null : Number(param.deleteStatus);

    const qb = this.messageUserEntity
      .createQueryBuilder('mu')
      .leftJoin(UserInfoEntity, 'u', 'mu.userId = u.id')
      .where('mu.messageId = :messageId', { messageId });

    if (readStatus === 0 || readStatus === 1) qb.andWhere('mu.readStatus = :readStatus', { readStatus });
    if (deleteStatus === 0 || deleteStatus === 1)
      qb.andWhere('mu.deleteStatus = :deleteStatus', { deleteStatus });

    qb.select([
      'mu.id as id',
      'mu.messageId as messageId',
      'mu.userId as userId',
      'mu.readStatus as readStatus',
      'mu.readTime as readTime',
      'mu.deleteStatus as deleteStatus',
      'mu.deleteTime as deleteTime',
      'mu.createTime as createTime',
      'u.nickName as nickName',
      'u.phone as phone',
      'u.avatarUrl as avatarUrl',
    ])
      .orderBy('mu.id', 'DESC')
      .offset((page - 1) * size)
      .limit(size);

    const list = await qb.getRawMany();

    const total = await this.messageUserEntity
      .createQueryBuilder('mu')
      .where('mu.messageId = :messageId', { messageId })
      .getCount();

    return { list, pagination: { page, size, total } };
  }

  async failPage(param: { messageId: number; page?: number; size?: number }) {
    const messageId = Number(param?.messageId);
    const page = Number(param?.page) > 0 ? Number(param.page) : 1;
    const size = Number(param?.size) > 0 ? Number(param.size) : 20;

    const qb = this.messageDeliveryFailEntity
      .createQueryBuilder('f')
      .leftJoin(UserInfoEntity, 'u', 'f.userId = u.id')
      .where('f.messageId = :messageId', { messageId })
      .select([
        'f.id as id',
        'f.messageId as messageId',
        'f.userId as userId',
        'f.reason as reason',
        'f.createTime as createTime',
        'u.nickName as nickName',
        'u.phone as phone',
      ])
      .orderBy('f.id', 'DESC')
      .offset((page - 1) * size)
      .limit(size);

    const list = await qb.getRawMany();
    const total = await this.messageDeliveryFailEntity
      .createQueryBuilder('f')
      .where('f.messageId = :messageId', { messageId })
      .getCount();

    return { list, pagination: { page, size, total } };
  }
}
