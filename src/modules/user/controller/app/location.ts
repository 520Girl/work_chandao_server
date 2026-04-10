import { Body, Inject, Post } from '@midwayjs/core';
import { BaseController, CoolController } from '@cool-midway/core';
import { Validate } from '@midwayjs/validate';
import { UserInfoService } from '../../service/info';
import { UserLocationReportDTO, UserLocationReverseDTO } from '../../dto/location';
import { GeoService } from '../../../base/service/geo';

@CoolController({
  prefix: '/app/user/location',
  api: [],
})
export class AppUserLocationController extends BaseController {
  @Inject()
  ctx;

  @Inject()
  userInfoService: UserInfoService;

  @Inject()
  geoService: GeoService;

  @Post('/report', { summary: '上报用户位置（展示用）' })
  @Validate()
  async report(@Body() body: UserLocationReportDTO) {
    await this.userInfoService.reportLocation(this.ctx.user.id, body);
    return this.ok();
  }

  @Post('/reverse', { summary: '逆地理：经纬度转省市' })
  @Validate()
  async reverse(@Body() body: UserLocationReverseDTO) {
    const geo = await this.geoService.reverseGeocode(Number(body.lat), Number(body.lng));
    return this.ok(geo ?? { province: null, city: null });
  }
}
