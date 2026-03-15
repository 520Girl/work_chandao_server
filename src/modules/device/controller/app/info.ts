import { Body, Inject, Post, Get, Query } from '@midwayjs/core';
import { BaseController, CoolController } from '@cool-midway/core';
import { DeviceInfoService } from '../../service/info';
import { DeviceBindDTO, DeviceUnbindDTO } from '../../dto/info';
import { DeviceMacDTO, DeviceSetWarningSettingAppDTO } from '../../dto/app';
import { Validate } from '@midwayjs/validate';

/**
 * 设备绑定
 */
@CoolController({
  prefix: '/app/device',
  api: [],
})
export class AppDeviceInfoController extends BaseController {
  @Inject()
  ctx;

  @Inject()
  deviceInfoService: DeviceInfoService;

  @Post('/bind', { summary: '绑定设备' })
  @Validate()
  async bind(@Body() body: DeviceBindDTO) {
    const { sn, model, mac } = body;
    return this.ok(
      await this.deviceInfoService.bind(this.ctx.user.id, sn, model, mac)
    );
  }

  @Post('/unbind', { summary: '解绑设备' })
  @Validate()
  async unbind(@Body() body: DeviceUnbindDTO) {
    await this.deviceInfoService.unbind(this.ctx.user.id, body.sn);
    return this.ok();
  }

  @Get('/list', { summary: '设备列表' })
  async list() {
    return this.ok(await this.deviceInfoService.listByUser(this.ctx.user.id));
  }

  @Get('/info', { summary: '设备信息' })
  @Validate()
  async deviceInfo(@Query() query: DeviceMacDTO) {
    const device = await this.deviceInfoService.getUserDeviceByMac(this.ctx.user.id, query.mac);
    return this.ok(await this.deviceInfoService.getDeviceInfo(device.mac));
  }

  @Post('/realtime', { summary: '设备实时数据' })
  @Validate()
  async realtime(@Body() body: DeviceMacDTO) {
    const device = await this.deviceInfoService.getUserDeviceByMac(this.ctx.user.id, body.mac);
    return this.ok(await this.deviceInfoService.getDeviceRealtimeData(device.mac));
  }

  @Get('/warning-setting', { summary: '获取预警设置' })
  @Validate()
  async getWarningSetting(@Query() query: DeviceMacDTO) {
    const device = await this.deviceInfoService.getUserDeviceByMac(this.ctx.user.id, query.mac);
    return this.ok(await this.deviceInfoService.getDeviceWarningSetting(device.mac));
  }

  @Post('/warning-setting', { summary: '设置预警参数' })
  @Validate()
  async setWarningSetting(@Body() body: DeviceSetWarningSettingAppDTO) {
    const device = await this.deviceInfoService.getUserDeviceByMac(this.ctx.user.id, body.mac);
    const { mac, ...settings } = body as any;
    return this.ok(await this.deviceInfoService.setDeviceWarningSetting(device.mac, settings));
  }

  @Get('/warning-info', { summary: '获取预警信息' })
  @Validate()
  async warningInfo(@Query() query: DeviceMacDTO) {
    const device = await this.deviceInfoService.getUserDeviceByMac(this.ctx.user.id, query.mac);
    return this.ok(await this.deviceInfoService.getDeviceWarningInfo(device.mac));
  }
}
