
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
   * 绑定设备（仅需 SN；未传 mac/model 时通过 SOAP GetDeviceInfo 按 SN 拉取并落库）
   */
  async bind(userId: number, sn: string, model?: string, mac?: string) {
    const snVal = String(sn || '').trim();
    if (!snVal) throw new CoolCommException('设备 SN 不能为空');

    let resolvedMac = String(mac || '').trim();
    let resolvedModel = String(model || '').trim();

    let device = await this.deviceInfoEntity.findOne({ where: { sn: snVal } });

    let cloudStatusId: number | undefined;
    if (!resolvedMac) {
      const profile = await this.fetchCloudDeviceProfileBySn(snVal, device?.mac);
      resolvedMac = profile.mac;
      if (!resolvedModel) {
        resolvedModel = profile.model;
      }
      cloudStatusId = profile.statusId;
    } else if (!resolvedModel) {
      const profile = await this.fetchCloudDeviceProfileBySn(snVal, resolvedMac);
      if (!resolvedModel) resolvedModel = profile.model;
      if (profile.statusId != null) cloudStatusId = profile.statusId;
    }

    if (!resolvedModel) {
      resolvedModel = '未知型号';
    }

    if (!device) {
      device = new DeviceInfoEntity();
      device.sn = snVal;
    }

    if (device.userId && device.userId !== userId) {
      throw new CoolCommException('该设备已被其他用户绑定');
    }

    const wasUnboundOrOtherUser = !device.userId || device.userId !== userId;
    device.userId = userId;
    device.model = resolvedModel;
    device.mac = resolvedMac;
    device.bindTime = new Date();
    device.status = cloudStatusId != null && Number.isFinite(cloudStatusId) ? cloudStatusId : 0;
    if (wasUnboundOrOtherUser) {
      device.sortOrder = await this.nextDeviceSortOrder(userId);
    }

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

  /** 用户下下一档 sortOrder（新绑定设备排在末尾） */
  async nextDeviceSortOrder(userId: number): Promise<number> {
    const row = await this.deviceInfoEntity
      .createQueryBuilder('d')
      .select('COALESCE(MAX(d.sortOrder), -1)', 'mx')
      .where('d.userId = :userId', { userId })
      .getRawOne();
    return Number(row?.mx ?? -1) + 1;
  }

  /**
   * 主设备：同用户 sortOrder 最小，其次 id 最小
   */
  async getPrimaryDeviceSn(userId: number): Promise<string | null> {
    const d = await this.deviceInfoEntity.findOne({
      where: { userId },
      order: { sortOrder: 'ASC', id: 'ASC' },
    });
    return d?.sn ?? null;
  }

  /**
   * 按 SN 顺序重排当前用户设备（order[0] 为主设备）
   */
  async reorderDevicesForUser(userId: number, sns: string[]) {
    if (!Array.isArray(sns) || sns.length === 0) {
      throw new CoolCommException('请传入设备 SN 顺序列表');
    }
    const all = await this.deviceInfoEntity.find({ where: { userId } });
    if (all.length !== sns.length) {
      throw new CoolCommException('order 须包含当前用户全部已绑定设备，数量须一致');
    }
    const owned = new Set(all.map(d => d.sn));
    const seen = new Set<string>();
    for (let i = 0; i < sns.length; i++) {
      const sn = String(sns[i] ?? '').trim();
      if (!sn) {
        throw new CoolCommException('SN 不能为空');
      }
      if (seen.has(sn)) {
        throw new CoolCommException('SN 重复');
      }
      seen.add(sn);
      if (!owned.has(sn)) {
        throw new CoolCommException(`设备未绑定: ${sn}`);
      }
      const device = all.find(d => d.sn === sn)!;
      await this.deviceInfoEntity.update(device.id, { sortOrder: i });
    }
    return this.listByUser(userId);
  }

  /**
   * 按用户查询设备列表
   */
  async listByUser(userId: number) {
    return this.deviceInfoEntity.find({
      where: { userId },
      order: { sortOrder: 'ASC', id: 'ASC' },
    });
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
   * @param macOrSn 文档字段名 mac；可传真实 MAC，也可传设备 SN
   */
  async getDeviceInfo(macOrSn: string) {
    const key = this.deviceConfig.secretKey;
    const mac = String(macOrSn || '').trim();
    if (!mac) throw new CoolCommException('设备 MAC/SN 不能为空');
    const result = await this.deviceSoapService.call('GetDeviceInfo', { key, mac });
    return result;
  }

  /**
   * 仅凭 SN 绑定时：按文档将 SN 填入 GetDeviceInfo 的 mac 参数（勿使用独立 sn 字段）。
   * 若本地已有 MAC 且按 SN 查询失败，再回退用 MAC 查询一次。
   */
  private async fetchCloudDeviceProfileBySn(
    snVal: string,
    knownMac?: string | null
  ): Promise<{ mac: string; model: string; statusId?: number }> {
    const fallbackMac = String(knownMac || '').trim();
    const queries =
      fallbackMac && fallbackMac !== snVal ? [snVal, fallbackMac] : [snVal];

    let lastError: CoolCommException | undefined;
    for (const queryMac of queries) {
      const result = await this.getDeviceInfo(queryMac);
      try {
        this.assertCloudOk(result, '获取设备信息失败');
        return this.parseCloudDeviceProfile(result, snVal);
      } catch (e) {
        if (!(e instanceof CoolCommException)) throw e;
        lastError = e;
        if (queries.length === 1) throw e;
      }
    }
    throw lastError ?? new CoolCommException('获取设备信息失败');
  }

  private parseCloudDeviceProfile(
    result: any,
    snVal: string
  ): { mac: string; model: string; statusId?: number } {
    const data = result?.data ?? result;
    const cloudSn = String(data?.sn || '').trim();
    if (cloudSn && cloudSn !== snVal) {
      throw new CoolCommException(
        `设备 SN 与云端不一致（请求 SN：${snVal}，云端：${cloudSn}）`
      );
    }

    const mac = String(data?.mac || '').trim();
    if (!mac) {
      throw new CoolCommException('云端未返回设备 MAC');
    }

    let statusId: number | undefined;
    if (data?.status?.id != null && data.status.id !== '') {
      const sid = Number(data.status.id);
      if (Number.isFinite(sid)) statusId = sid;
    }

    return {
      mac,
      model: String(data?.model || '').trim() || '未知型号',
      statusId,
    };
  }

  private assertCloudOk(result: any, fallback: string) {
    if (result?.ret != null && Number(result.ret) !== 0) {
      const msg = String(result?.msg || fallback).trim();
      const code = result?.err_code != null ? `（err_code=${result.err_code}）` : '';
      throw new CoolCommException(`${msg}${code}`);
    }
    if (result?.err_code != null && Number(result.err_code) !== 0) {
      const msg = String(result?.msg || fallback).trim();
      throw new CoolCommException(`${msg}（err_code=${result.err_code}）`);
    }
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
