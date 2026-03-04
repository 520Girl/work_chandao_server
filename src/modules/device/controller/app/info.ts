import { Body, Inject, Post, Get } from '@midwayjs/core';
import { BaseController, CoolController } from '@cool-midway/core';
import { DeviceInfoService } from '../../service/info';
import { DeviceBindDTO, DeviceUnbindDTO } from '../../dto/info';
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
}
