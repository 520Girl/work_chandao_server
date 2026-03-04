
import { Provide, Inject, Config } from '@midwayjs/core';
import { BaseService, CoolCommException } from '@cool-midway/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import { DeviceInfoEntity } from '../entity/info';
import { MeditationDataEntity } from '../../meditation/entity/data';
import { MeditationSessionEntity } from '../../meditation/entity/session';
import { DeviceSoapService } from './soap';
import { MeditationWsService } from '../../meditation/service/ws';

/**
 * Device Service
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
  meditationWsService: MeditationWsService;

  @Config('device')
  deviceConfig;

  /**
   * Bind device
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
    device.status = 1; // Online/Active

    await this.deviceInfoEntity.save(device);
    return device;
  }

  /**
   * Unbind device
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
    device.status = 0; // Offline/Inactive
    await this.deviceInfoEntity.save(device);
  }

  /**
   * Add device
   */
  async add(param: any) {
    const exists = await this.deviceInfoEntity.findOneBy({ sn: param.sn });
    if (exists) {
      throw new CoolCommException('设备序列号已存在');
    }
    return super.add(param);
  }

  /**
   * Update device
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
   * List devices by user
   */
  async listByUser(userId: number) {
    return this.deviceInfoEntity.find({ where: { userId } });
  }

  /**
   * Receive pushed data (e.g. from webhook)
   */
  async pushData(data: any) {
    // Implement based on data structure
    // Assuming data has sn/mac and sensor values
    const mac = data.mac || data.MAC;
    if (!mac) return;

    // Reuse realtime logic logic or save directly
    // For now, just log or simple save
    console.log('Received push data:', data);
    // TODO: Implement actual saving logic if format is known
    return true;
  }

  /**
   * Get device info (SOAP)
   */
  async getDeviceInfo(mac: string) {
    const key = this.deviceConfig.secretKey;
    const result = await this.deviceSoapService.call('GetDeviceInfo', { key, mac });
    return result;
  }

  /**
   * Get device realtime data and push to user (SOAP)
   */
  async getDeviceRealtimeData(mac: string) {
    const key = this.deviceConfig.secretKey;
    
    // 1. Call SOAP
    const resp = await this.deviceSoapService.call('GetDeviceRealtimeData', { key, mac });
    const data = resp?.data ?? resp;
    
    // 2. Find device and user
    const device = await this.deviceInfoEntity.findOne({ where: { mac } });
    if (!device) {
      // Device might not be in DB or just not bound
      // If strict, throw error. If loose, just return data.
      return resp;
    }

    // 3. Save to DB (MeditationData)
    const meditationData = new MeditationDataEntity();
    
    // Check active session
    // Note: MeditationSessionEntity uses 'sn' (string) not 'deviceSn'
    const session = await this.meditationSessionEntity.findOne({
      where: { sn: device.sn, status: 1 }, // Assuming 1 is 'In Progress' based on dict ['未知', '进行中', '已结束']? 
      // Wait, dict: ['未知', '进行中', '已结束', '异常中断']. Index 1 is '进行中'.
      order: { id: 'DESC' }
    });

    if (session) {
      meditationData.sessionId = session.id;
      session.lastActiveTime = new Date();
      await this.meditationSessionEntity.save(session);
    } else {
      meditationData.sessionId = 0; // Default if no session
    }

    // Map fields
    meditationData.recordTime = new Date(); // timestamp
    meditationData.heartRate = data.heart_rate || data.heartRate || 0;
    meditationData.breathRate = data.breath_rate || data.breathRate || 0;
    meditationData.inBed = (data.inbed ?? data.inBed ?? (data.status?.id ? Number(data.status.id) !== 4 : 0)) ? 1 : 0;
    meditationData.bodyMovement = data.body_movement || data.bodyMovement || 0;
    meditationData.respiratoryWave = data.respiratory_wave || data.respiratoryWave || '';
    meditationData.heartRateWave = data.heart_rate_wave || data.heartRateWave || '';
    meditationData.waveform = (meditationData.respiratoryWave || meditationData.heartRateWave) ? 1 : 0;

    await this.meditationDataEntity.save(meditationData);

    // 4. WebSocket Push
    if (device.userId) {
      this.meditationWsService.sendToUser(device.userId, {
        type: 'realtime',
        data: meditationData
      });
    }

    return resp;
  }

  /**
   * Get warning info
   */
  async getDeviceWarningInfo(mac: string) {
    const key = this.deviceConfig.secretKey;
    return await this.deviceSoapService.call('GetDeviceWarningInfo', { key, mac });
  }

  /**
   * Get warning setting
   */
  async getDeviceWarningSetting(mac: string) {
    const key = this.deviceConfig.secretKey;
    return await this.deviceSoapService.call('GetDeviceWarningSetting', { key, mac });
  }

  /**
   * Set warning setting
   */
  async setDeviceWarningSetting(mac: string, settings: any) {
    const key = this.deviceConfig.secretKey;
    return await this.deviceSoapService.call('SetDeviceWarningSetting', { key, mac, ...settings });
  }

  /**
   * Get sleep reports
   */
  async getSleepReports(mac: string, startDate: string, endDate: string) {
    const key = this.deviceConfig.secretKey;
    return await this.deviceSoapService.call('GetSleepReportsByDateRange', { key, mac, startDate, endDate });
  }

  /**
   * Get sleep report detail
   */
  async getSleepReportDetail(reportId: string) {
    const key = this.deviceConfig.secretKey;
    return await this.deviceSoapService.call('GetSleepReportDetailByReportId', { key, reportId });
  }

  /**
   * Voice alert
   */
  async voiceAlert(mac: string, type: number) {
    const key = this.deviceConfig.secretKey;
    return await this.deviceSoapService.call('VoiceAlertNotification', { key, mac, type });
  }
}
