
import { Provide, Inject, Config } from '@midwayjs/core';
import { BaseService, CoolCommException } from '@cool-midway/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import { DeviceInfoEntity } from '../entity/info';
import { MeditationDataEntity } from '../../meditation/entity/data';
import { MeditationSessionEntity } from '../../meditation/entity/session';
import { DeviceSoapService } from './soap';
import { BaseSysParamService } from '../../base/service/sys/param';
import * as zlib from 'zlib';

/**
 * 设备服务
 */
@Provide()
export class DeviceInfoService extends BaseService {
  @InjectEntityModel(DeviceInfoEntity)
  deviceInfoEntity: Repository<DeviceInfoEntity>;

  @InjectEntityModel(MeditationDataEntity)
  meditationDataEntity: Repository<MeditationDataEntity>;

  @InjectEntityModel(MeditationSessionEntity)
  meditationSessionEntity: Repository<MeditationSessionEntity>;

  @Inject()
  deviceSoapService: DeviceSoapService;

  @Inject()
  baseSysParamService: BaseSysParamService;

  @Config('device')
  deviceConfig;

  /**
   * 绑定设备
   */
  async bind(userId: number, sn: string, model: string, mac: string) {
    let device = await this.deviceInfoEntity.findOne({ where: { sn } });
    if (!device) {
      device = new DeviceInfoEntity();
      device.sn = sn;
    }
    
    if (device.userId && device.userId !== userId) {
      throw new CoolCommException('该设备已被其他用户绑定');
    }

    device.userId = userId;
    device.model = model;
    device.mac = mac;
    device.bindTime = new Date();
    device.status = 1; // 在线/激活

    await this.deviceInfoEntity.save(device);
    return device;
  }

  /**
   * 解绑设备
   */
  async unbind(userId: number, sn: string, isForce = false) {
    const device = await this.deviceInfoEntity.findOne({ where: { sn } });
    if (!device) {
      throw new CoolCommException('设备不存在');
    }

    if (!isForce && device.userId !== userId) {
      throw new CoolCommException('该设备未绑定此用户');
    }

    device.userId = null;
    device.bindTime = null;
    device.status = 0; // 离线/未激活
    await this.deviceInfoEntity.save(device);
  }

  /**
   * 新增设备
   */
  async add(param: any) {
    const exists = await this.deviceInfoEntity.findOneBy({ sn: param.sn });
    if (exists) {
      throw new CoolCommException('设备序列号已存在');
    }
    return super.add(param);
  }

  /**
   * 更新设备
   */
  async update(param: any) {
    if (param.sn) {
      const exists = await this.deviceInfoEntity.findOneBy({ sn: param.sn });
      if (exists && exists.id !== param.id) {
        throw new CoolCommException('设备序列号已存在');
      }
    }
    return super.update(param);
  }

  /**
   * 按用户查询设备列表
   */
  async listByUser(userId: number) {
    return this.deviceInfoEntity.find({ where: { userId } });
  }

  async getUserDeviceByMac(userId: number, mac: string) {
    const device = await this.deviceInfoEntity.findOne({ where: { userId, mac } });
    if (!device) {
      throw new CoolCommException('设备未绑定');
    }
    return device;
  }

  /**
   * 接收设备推送数据（例如 webhook）
   */
  async pushData(data: any) {
    // 根据数据结构实现
    // 假设数据中包含 sn/mac 和传感器指标
    const mac = data.mac || data.MAC;
    if (!mac) return;

    // 复用实时数据处理逻辑，或直接存储
    // 当前先做日志输出或简单保存
    console.log('Received push data:', data);
    // TODO: 当数据格式明确后实现实际存储逻辑
    return true;
  }

  /**
   * 获取设备信息（SOAP）
   */
  async getDeviceInfo(mac: string) {
    const key = this.deviceConfig.secretKey;
    const result = await this.deviceSoapService.call('GetDeviceInfo', { key, mac });
    return result;
  }

  async refreshDeviceStatusFromCloud(mac: string) {
    const info = await this.getDeviceInfo(mac);
    const data = info?.data ?? info;
    const statusId = data?.status?.id;
    if (statusId == null) return info;
    await this.deviceInfoEntity.update({ mac }, { status: statusId, statusUpdateTime: new Date() });
    return info;
  }

  async getDeviceRealtimeData(mac: string, options?: { timestamp?: number; waveform?: boolean }) {
    const key = this.deviceConfig.secretKey;
    const timestamp = Number(options?.timestamp ?? 0) || 0;
    const waveform = options?.waveform === true;
    const resp = await this.deviceSoapService.call('GetDeviceRealtimeData', { key, mac, timestamp, waveform });
    return resp;
  }

  async getMeditationRealtimeData(mac: string) {
    const device = await this.deviceInfoEntity.findOne({ where: { mac } });
    if (!device) return { resp: null, saved: null };

    const session = await this.meditationSessionEntity.findOne({
      where: { sn: device.sn, status: 1 },
      order: { id: 'DESC' },
    });
    if (!session) return { resp: null, saved: null };

    const resp = await this.getDeviceRealtimeData(mac, { timestamp: 0, waveform: true });
    const saved = await this.saveMeditationRealtimeData(session.id, resp);
    return { resp, saved };
  }

  private async saveMeditationRealtimeData(sessionId: number, resp: any) {

    const samples = Array.isArray(resp?.data)
      ? resp.data
      : resp?.data
        ? [resp.data]
        : [];
    if (!samples.length) return null;

    const maxSaveParam = await this.baseSysParamService.dataByKey(
      'MEDITATION_REALTIME_MAX_SAVE_PER_POLL'
    );
    const maxSavePerPoll = Math.max(1, Number(maxSaveParam ?? 5) || 5);

    const waveSampleIntervalParam = await this.baseSysParamService.dataByKey(
      'MEDITATION_WAVE_SAVE_INTERVAL_MS'
    );
    const waveSampleIntervalMs = Number(waveSampleIntervalParam ?? 10000) || 10000;
    const lastWaveRow: any = await this.meditationDataEntity
      .createQueryBuilder('d')
      .select(['d.recordTimestamp as recordTimestamp'])
      .where('d.sessionId = :sessionId', { sessionId })
      .andWhere('d.waveBlob IS NOT NULL')
      .orderBy('d.recordTimestamp', 'DESC')
      .getRawOne();
    let lastWaveTimestamp = Number(lastWaveRow?.recordTimestamp ?? 0) || 0;

    const getWavesSize = (sample: any) => {
      const left = sample?.left ?? {};
      const right = sample?.right ?? {};
      const leftRespWave = left?.respiratory_wave ?? left?.respiratoryWave ?? [];
      const leftHrWave = left?.heart_rate_wave ?? left?.heartRateWave ?? [];
      const rightRespWave = right?.respiratory_wave ?? right?.respiratoryWave ?? [];
      const rightHrWave = right?.heart_rate_wave ?? right?.heartRateWave ?? [];
      return (
        (Array.isArray(leftRespWave) ? leftRespWave.length : 0) +
        (Array.isArray(leftHrWave) ? leftHrWave.length : 0) +
        (Array.isArray(rightRespWave) ? rightRespWave.length : 0) +
        (Array.isArray(rightHrWave) ? rightHrWave.length : 0)
      );
    };

    const dedupMap = new Map<number, any>();
    for (const sample of samples) {
      const recordTimestamp = Number(sample?.id ?? resp?.timestamp ?? Date.now()) || Date.now();
      const existing = dedupMap.get(recordTimestamp);
      if (!existing) {
        dedupMap.set(recordTimestamp, sample);
        continue;
      }
      if (getWavesSize(sample) > getWavesSize(existing)) {
        dedupMap.set(recordTimestamp, sample);
      }
    }

    const deduped = Array.from(dedupMap.entries())
      .map(([recordTimestamp, sample]) => ({ recordTimestamp, sample }))
      .sort((a, b) => a.recordTimestamp - b.recordTimestamp);

    const selected =
      deduped.length > maxSavePerPoll ? deduped.slice(deduped.length - maxSavePerPoll) : deduped;
    const maxSelectedTimestamp = selected?.[selected.length - 1]?.recordTimestamp ?? 0;
    if (maxSelectedTimestamp && lastWaveTimestamp > maxSelectedTimestamp) {
      lastWaveTimestamp = 0;
    }

    const rows: Partial<MeditationDataEntity>[] = [];
    for (const item of selected) {
      const recordTimestamp = item.recordTimestamp;
      const sample = item.sample;
      const left = sample?.left ?? {};
      const right = sample?.right ?? {};

      const leftRespWave = left?.respiratory_wave ?? left?.respiratoryWave ?? [];
      const leftHrWave = left?.heart_rate_wave ?? left?.heartRateWave ?? [];
      const rightRespWave = right?.respiratory_wave ?? right?.respiratoryWave ?? [];
      const rightHrWave = right?.heart_rate_wave ?? right?.heartRateWave ?? [];

      const inBed = sample?.inbed === true || sample?.inBed === true ? 1 : 0;

      let bodyMovement = sample?.body_movement ?? sample?.bodyMovement ?? 0;
      if (typeof bodyMovement === 'boolean') bodyMovement = bodyMovement ? 1 : 0;

      let waveBlob: Buffer = null;
      if (recordTimestamp - lastWaveTimestamp >= waveSampleIntervalMs) {
        lastWaveTimestamp = recordTimestamp;
        waveBlob = zlib.gzipSync(
          Buffer.from(
            JSON.stringify({
              left: { respiratory_wave: leftRespWave, heart_rate_wave: leftHrWave },
              right: { respiratory_wave: rightRespWave, heart_rate_wave: rightHrWave },
            })
          )
        );
      }

      rows.push({
        sessionId,
        recordTimestamp,
        heartRate: Number(left?.heart_rate ?? left?.heartRate ?? 0) || 0,
        breathRate: Number(left?.respiration_rate ?? left?.respirationRate ?? 0) || 0,
        rightHeartRate: Number(right?.heart_rate ?? right?.heartRate ?? 0) || 0,
        rightBreathRate: Number(right?.respiration_rate ?? right?.respirationRate ?? 0) || 0,
        temperature: Number(sample?.temperature ?? 0) || 0,
        humidity: Number(sample?.humidity ?? 0) || 0,
        inBed,
        bodyMovement: Number(bodyMovement) || 0,
        waveBlob,
      });
    }

    if (!rows.length) return null;

    let lastInserted: Partial<MeditationDataEntity> = null;
    try {
      await this.meditationDataEntity.insert(rows as any);
      lastInserted = rows[rows.length - 1];
    } catch (e) {
      for (const row of rows) {
        try {
          await this.meditationDataEntity.insert(row as any);
          lastInserted = row;
        } catch (e2) {}
      }
    }

    return lastInserted;
  }

  /**
   * 获取预警信息
   */
  async getDeviceWarningInfo(mac: string) {
    const key = this.deviceConfig.secretKey;
    return await this.deviceSoapService.call('GetDeviceWarningInfo', { key, mac });
  }

  /**
   * 获取预警设置
   */
  async getDeviceWarningSetting(mac: string) {
    const key = this.deviceConfig.secretKey;
    const data = await this.deviceSoapService.call('GetDeviceWarningSetting', { key, mac });
    console.log('获取预警设置:', data);
    return data;
  }

  /**
   * 设置预警参数
   */
  async setDeviceWarningSetting(mac: string, settings: any) {
    const key = this.deviceConfig.secretKey;
    if (settings) {
      if (settings.heartRateHigh != null && settings.hr_too_fast == null) {
        settings.hr_too_fast = settings.heartRateHigh;
      }
      if (settings.heartRateLow != null && settings.hr_too_slow == null) {
        settings.hr_too_slow = settings.heartRateLow;
      }
      if (settings.breathRateHigh != null && settings.br_too_fast == null) {
        settings.br_too_fast = settings.breathRateHigh;
      }
      if (settings.breathRateLow != null && settings.br_too_slow == null) {
        settings.br_too_slow = settings.breathRateLow;
      }
      if (settings.leaveBedDuration != null && settings.outbed_exceed == null) {
        settings.outbed_exceed = settings.leaveBedDuration;
      }
    }
    return await this.deviceSoapService.call('SetDeviceWarningSetting', { key, mac, ...settings });
  }

  /**
   * 获取睡眠报告列表
   */
  async getSleepReports(mac: string, start_date: string, end_date: string) {
    const key = this.deviceConfig.secretKey;
    return await this.deviceSoapService.call('GetSleepReportsByDateRange', { key, mac, start_date, end_date });
  }

  /**
   * 获取睡眠报告详情
   */
  async getSleepReportDetail(report_id: number) {
    const key = this.deviceConfig.secretKey;
    return await this.deviceSoapService.call('GetSleepReportDetailByReportId', { key, report_id });
  }

  /**
   * 获取实时睡眠报告
   */
  async getRealtimeSleepReport(mac: string) {
    const key = this.deviceConfig.secretKey;
    return await this.deviceSoapService.call('GetRealtimeSleepReport', { key, mac });
  }

  /**
   * 语音预警
   */
  async voiceAlert(mac: string, type: number) {
    const key = this.deviceConfig.secretKey;
    return await this.deviceSoapService.call('VoiceAlertNotification', { key, mac, type });
  }
}
