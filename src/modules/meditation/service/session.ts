
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

  @Inject()
  deviceInfoService: DeviceInfoService;

  @Inject()
  baseSysParamService: BaseSysParamService;

  /**
   * 开始冥想
   */
  async start(userId: number, sn?: string, targetDuration?: number, type?: number) {
    const sessionType = type || (sn ? 1 : 2);
    if (sessionType === 1) {
      if (!sn) {
        throw new CoolCommException('设备SN不能为空');
      }
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
      return { status: 'ended', reason: 'finished' };
    }

    const timeout =
      (await this.baseSysParamService.dataByKey('MEDITATION_AUTO_END_TIMEOUT_MIN')) || 5;
    const now = Date.now();
    const lastActive = session.lastActiveTime ? session.lastActiveTime.getTime() : session.startDate.getTime();
    
    if (now - lastActive > timeout * 60 * 1000) {
      await this.end(userId, session.id);
      return { status: 'ended', reason: 'timeout' };
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

    return { 
      status: 'ongoing', 
      resp,
      saved,
      deviceStatusId,
      elapsed: Math.floor((now - session.startDate.getTime()) / 1000)
    };
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

    if (session.status !== 1) {
      throw new CoolCommException('冥想会话已结束');
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

    // 仅针对有设备的会话计算数据评分
    let focusScore = 0;
    if (session.type === 1) {
      const data = await this.meditationDataEntity.findBy({
        sessionId: session.id,
      });
      focusScore = this.calcFocusScore(data);
    }
    
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
      .select(['a.id', 'a.userId'])
      .getMany();

    for (const s of sessions) {
      try {
        await this.end(s.userId, s.id);
      } catch (e) {}
    }
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
