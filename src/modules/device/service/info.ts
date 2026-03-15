
import { Provide, Inject, Config } from '@midwayjs/core';
import { BaseService, CoolCommException } from '@cool-midway/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import { DeviceInfoEntity } from '../entity/info';
import { MeditationDataEntity } from '../../meditation/entity/data';
import { MeditationSessionEntity } from '../../meditation/entity/session';
import { DeviceSoapService } from './soap';
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

  async getDeviceRealtimeData(mac: string) {
    const key = this.deviceConfig.secretKey;
    const resp = await this.deviceSoapService.call('GetDeviceRealtimeData', { key, mac });
    return resp;
  }

  async getMeditationRealtimeData(mac: string) {
    const resp = await this.getDeviceRealtimeData(mac);
    const saved = await this.saveMeditationRealtimeData(mac, resp);
    return { resp, saved };
  }

  private async saveMeditationRealtimeData(mac: string, resp: any) {
    const device = await this.deviceInfoEntity.findOne({ where: { mac } });
    if (!device) return null;

    const session = await this.meditationSessionEntity.findOne({
      where: { sn: device.sn, status: 1 },
      order: { id: 'DESC' },
    });
    if (!session) return null;

    const samples = Array.isArray(resp?.data)
      ? resp.data
      : resp?.data
        ? [resp.data]
        : [];
    if (!samples.length) return null;

    let lastSaved: MeditationDataEntity = null;
    for (const sample of samples) {
      const left = sample?.left ?? {};
      const right = sample?.right ?? {};

      const leftRespWave = left?.respiratory_wave ?? left?.respiratoryWave ?? [];
      const leftHrWave = left?.heart_rate_wave ?? left?.heartRateWave ?? [];
      const rightRespWave = right?.respiratory_wave ?? right?.respiratoryWave ?? [];
      const rightHrWave = right?.heart_rate_wave ?? right?.heartRateWave ?? [];

      const recordTimestamp = Number(sample?.id ?? resp?.timestamp ?? Date.now()) || Date.now();
      const inBed = sample?.inbed === true || sample?.inBed === true ? 1 : 0;

      let bodyMovement = sample?.body_movement ?? sample?.bodyMovement ?? 0;
      if (typeof bodyMovement === 'boolean') bodyMovement = bodyMovement ? 1 : 0;

      lastSaved = await this.meditationDataEntity.save({
        sessionId: session.id,
        recordTimestamp,
        heartRate: Number(left?.heart_rate ?? left?.heartRate ?? 0) || 0,
        breathRate: Number(left?.respiration_rate ?? left?.respirationRate ?? 0) || 0,
        inBed,
        bodyMovement: Number(bodyMovement) || 0,
        waveBlob: zlib.gzipSync(
          Buffer.from(
            JSON.stringify({
              left: { respiratory_wave: leftRespWave, heart_rate_wave: leftHrWave },
              right: { respiratory_wave: rightRespWave, heart_rate_wave: rightHrWave },
            })
          )
        ),
      });
    }

    return lastSaved;
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
  async getSleepReports(mac: string, startDate: string, endDate: string) {
    const key = this.deviceConfig.secretKey;
    return await this.deviceSoapService.call('GetSleepReportsByDateRange', { key, mac, startDate, endDate });
  }

  /**
   * 获取睡眠报告详情
   */
  async getSleepReportDetail(reportId: string) {
    const key = this.deviceConfig.secretKey;
    return await this.deviceSoapService.call('GetSleepReportDetailByReportId', { key, reportId });
  }

  /**
   * 语音预警
   */
  async voiceAlert(mac: string, type: number) {
    const key = this.deviceConfig.secretKey;
    return await this.deviceSoapService.call('VoiceAlertNotification', { key, mac, type });
  }
}
