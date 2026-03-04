
import { Provide } from '@midwayjs/core';
import { BaseService, CoolCommException, CoolEventManager } from '@cool-midway/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import { MeditationSessionEntity } from '../entity/session';
import { DeviceInfoEntity } from '../../device/entity/info';
import { MeditationReportEntity } from '../entity/report';
import { MeditationDataEntity } from '../entity/data';
import { Inject } from '@midwayjs/core';

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

  @Inject()
  coolEventManager: CoolEventManager;

  /**
   * 开始冥想
   */
  async start(userId: number, sn: string, targetDuration: number) {
    if (!sn) {
      throw new CoolCommException('设备SN不能为空');
    }
    const device = await this.deviceInfoEntity.findOneBy({ sn, userId });
    if (!device) {
      throw new CoolCommException('设备未绑定');
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
      sn,
      startDate: new Date(),
      status: 1,
      targetDuration: targetDuration || 0,
      lastActiveTime: new Date(),
    });
    return session;
  }

  /**
   * 结束冥想
   */
  async end(userId: number, sessionId?: number) {
    const session = sessionId
      ? await this.meditationSessionEntity.findOneBy({ id: sessionId, userId })
      : await this.meditationSessionEntity.findOneBy({ userId, status: 1 });

    if (!session) {
      throw new CoolCommException('冥想会话不存在');
    }

    const endDate = new Date();
    await this.meditationSessionEntity.update(session.id, {
      endDate,
      status: 2,
    });

    const totalDuration = Math.max(
      0,
      Math.floor((endDate.getTime() - session.startDate.getTime()) / 1000)
    );

    const data = await this.meditationDataEntity.findBy({
      sessionId: session.id,
    });
    const focusScore = this.calcFocusScore(data);
    const achievements = await this.calcAchievements(userId, endDate);

    const report = await this.meditationReportEntity.save({
      sessionId: session.id,
      totalDuration,
      focusScore,
      achievements,
    });

    // 触发冥想结束事件
    this.coolEventManager.emit('meditationEnded', session);

    return report;
  }

  /**
   * 报告历史
   */
  async reportHistory(userId: number) {
    return this.meditationReportEntity
      .createQueryBuilder('a')
      .leftJoin(MeditationSessionEntity, 'b', 'a.sessionId = b.id')
      .where('b.userId = :userId', { userId })
      .orderBy('a.id', 'DESC')
      .select(['a.*', 'b.sn', 'b.startDate', 'b.endDate', 'b.targetDuration'])
      .getRawMany();
  }

  private calcFocusScore(data: MeditationDataEntity[]) {
    if (!data || data.length === 0) return 0;
    const avgMovement =
      data.reduce((sum, item) => sum + (item.bodyMovement || 0), 0) /
      data.length;
    const avgHeart =
      data.reduce((sum, item) => sum + (item.heartRate || 0), 0) /
      data.length;
    const score = 100 - (avgMovement * 2 + (100 - avgHeart));
    return Math.max(0, Math.min(100, Math.round(score)));
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
