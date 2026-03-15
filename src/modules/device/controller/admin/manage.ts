
import { Provide, Inject, Body, Query, Get, Post, Controller } from '@midwayjs/core';
import { CoolController, BaseController } from '@cool-midway/core';
import { DeviceInfoService } from '../../service/info';
import { DeviceInfoEntity } from '../../entity/info';
import { Validate } from '@midwayjs/validate';
import { DeviceForceUnbindDTO } from '../../dto/admin';
import { 
  DeviceInfoDTO, 
  DeviceRealtimeDTO, 
  DeviceWarningInfoDTO, 
  DeviceWarningSettingDTO, 
  DeviceSetWarningSettingDTO, 
  DeviceSleepReportDTO, 
  DeviceSleepReportDetailDTO, 
  DeviceVoiceAlertDTO 
} from '../../dto/manage';

/**
 * 设备管理接口
 */
@Provide()
@CoolController({
  api: ['add', 'delete', 'update', 'list', 'page'],
  entity: DeviceInfoEntity,
  service: DeviceInfoService
})
export class AdminDeviceManageController extends BaseController {
  @Inject()
  deviceInfoService: DeviceInfoService;

  /**
   * 获取设备信息
   */
  @Get('/info', { summary: '获取设备信息' })
  @Validate()
  async getDeviceInfo(@Query() query: DeviceInfoDTO) {
    return this.ok(await this.deviceInfoService.getDeviceInfo(query.mac));
  }

  /**
   * 获取实时数据
   */
  @Post('/realtime', { summary: '获取设备实时数据' })
  @Validate()
  async getDeviceRealtimeData(@Body() body: DeviceRealtimeDTO) {
    await this.deviceInfoService.refreshDeviceStatusFromCloud(body.mac);
    return this.ok(await this.deviceInfoService.getDeviceRealtimeData(body.mac));
  }

  /**
   * 获取预警信息
   */
  @Get('/warning-info', { summary: '获取设备预警信息' })
  @Validate()
  async getDeviceWarningInfo(@Query() query: DeviceWarningInfoDTO) {
    return this.ok(await this.deviceInfoService.getDeviceWarningInfo(query.mac));
  }

  /**
   * 获取预警设置
   */
  @Get('/warning-setting', { summary: '获取设备预警设置' })
  @Validate()
  async getDeviceWarningSetting(@Query() query: DeviceWarningSettingDTO) {
    return this.ok(await this.deviceInfoService.getDeviceWarningSetting(query.mac));
  }

  /**
   * 设置预警参数
   */
  @Post('/warning-setting', { summary: '设置设备预警参数' })
  @Validate()
  async setDeviceWarningSetting(@Body() body: DeviceSetWarningSettingDTO) {
    const { mac, id, ...settings } = body as any;
    return this.ok(await this.deviceInfoService.setDeviceWarningSetting(mac, settings));
  }

  /**
   * 获取睡眠报告列表
   */
  @Get('/sleep-reports', { summary: '获取睡眠报告列表' })
  @Validate()
  async getSleepReports(@Query() query: DeviceSleepReportDTO) {
    return this.ok(await this.deviceInfoService.getSleepReports(query.mac, query.startDate, query.endDate));
  }

  /**
   * 获取睡眠报告详情
   */
  @Get('/sleep-report-detail', { summary: '获取睡眠报告详情' })
  @Validate()
  async getSleepReportDetail(@Query() query: DeviceSleepReportDetailDTO) {
    return this.ok(await this.deviceInfoService.getSleepReportDetail(query.reportId));
  }

  /**
   * 语音预警
   */
  @Post('/voice-alert', { summary: '发送语音预警' })
  @Validate()
  async voiceAlert(@Body() body: DeviceVoiceAlertDTO) {
    return this.ok(await this.deviceInfoService.voiceAlert(body.mac, body.type));
  }

  @Post('/forceUnbind', { summary: '强制解绑设备' })
  @Validate()
  async forceUnbind(@Body() body: DeviceForceUnbindDTO) {
    await this.deviceInfoService.unbind(0, body.sn, true);
    return this.ok();
  }
}
