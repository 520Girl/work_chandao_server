import { Body, Inject, Post } from '@midwayjs/core';
import { BaseController, CoolController } from '@cool-midway/core';
import { DeviceInfoService } from '../../service/info';
import { Validate } from '@midwayjs/validate';
import { DevicePushDataDTO } from '../../dto/receiver';

/**
 * 设备数据接收
 */
@CoolController({
  prefix: '/api/device',
  api: [],
})
export class OpenDeviceReceiverController extends BaseController {
  @Inject()
  deviceInfoService: DeviceInfoService;

  @Post('/push-data', { summary: '接收设备数据' })
  @Validate()
  async pushData(@Body() body: DevicePushDataDTO) {
    return this.deviceInfoService.pushData(body);
  }
}
