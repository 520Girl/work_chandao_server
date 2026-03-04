import {
  CoolController,
  BaseController,
  CoolUrlTag,
  TagTypes,
  CoolTag,
} from '@cool-midway/core';
import { Body, Get, Inject, Post, Query } from '@midwayjs/core';
import { UserLoginService } from '../../service/login';
import { BaseSysLoginService } from '../../../base/service/sys/login';
import { Validate } from '@midwayjs/validate';
import {
  UserMiniLoginDTO,
  UserMPLoginDTO,
  UserWxAppLoginDTO,
  UserPhoneLoginDTO,
  UserUniPhoneLoginDTO,
  UserRefreshTokenDTO,
  UserCaptchaDTO,
  UserSmsCodeDTO,
  UserSmsCodeVerifyDTO,
  UserPasswordLoginDTO,
} from '../../dto/login';

/**
 * 登录
 */
@CoolUrlTag()
@CoolController()
export class AppUserLoginController extends BaseController {
  @Inject()
  userLoginService: UserLoginService;

  @Inject()
  baseSysLoginService: BaseSysLoginService;

  @CoolTag(TagTypes.IGNORE_TOKEN)
  @Post('/mini', { summary: '小程序登录' })
  @Validate()
  async mini(@Body() body: UserMiniLoginDTO) {
    return this.ok(await this.userLoginService.mini(body.code, body.encryptedData, body.iv));
  }

  @CoolTag(TagTypes.IGNORE_TOKEN)
  @Post('/mp', { summary: '公众号登录' })
  @Validate()
  async mp(@Body() body: UserMPLoginDTO) {
    return this.ok(await this.userLoginService.mp(body.code));
  }

  @CoolTag(TagTypes.IGNORE_TOKEN)
  @Post('/wxApp', { summary: '微信APP授权登录' })
  @Validate()
  async app(@Body() body: UserWxAppLoginDTO) {
    return this.ok(await this.userLoginService.wxApp(body.code));
  }

  @CoolTag(TagTypes.IGNORE_TOKEN)
  @Post('/phone', { summary: '手机号登录' })
  @Validate()
  async phone(@Body() body: UserPhoneLoginDTO) {
    return this.ok(await this.userLoginService.phoneVerifyCode(body.phone, body.smsCode));
  }

  @CoolTag(TagTypes.IGNORE_TOKEN)
  @Post('/uniPhone', { summary: '一键手机号登录' })
  @Validate()
  async uniPhone(@Body() body: UserUniPhoneLoginDTO) {
    return this.ok(
      await this.userLoginService.uniPhone(body.access_token, body.openid, body.appId)
    );
  }

  @CoolTag(TagTypes.IGNORE_TOKEN)
  @Post('/miniPhone', { summary: '绑定小程序手机号' })
  @Validate()
  async miniPhone(@Body() body: UserMiniLoginDTO) {
    return this.ok(
      await this.userLoginService.miniPhone(body.code, body.encryptedData, body.iv)
    );
  }

  @CoolTag(TagTypes.IGNORE_TOKEN)
  @Get('/captcha', { summary: '图片验证码' })
  async captcha(
    @Query('width') width: number,
    @Query('height') height: number,
    @Query('color') color: string
  ) {
    return this.ok(
      await this.baseSysLoginService.captcha(width, height, color)
    );
  }

  @CoolTag(TagTypes.IGNORE_TOKEN)
  @Post('/smsCode', { summary: '验证码' })
  @Validate()
  async smsCode(@Body() body: UserSmsCodeVerifyDTO) {
    return this.ok(await this.userLoginService.smsCode(body.phone, body.captchaId, body.code));
  }

  @CoolTag(TagTypes.IGNORE_TOKEN)
  @Post('/refreshToken', { summary: '刷新token' })
  @Validate()
  public async refreshToken(@Body() body: UserRefreshTokenDTO) {
    return this.ok(await this.userLoginService.refreshToken(body.refreshToken));
  }

  @CoolTag(TagTypes.IGNORE_TOKEN)
  @Post('/password', { summary: '密码登录' })
  @Validate()
  async password(@Body() body: UserPasswordLoginDTO) {
    return this.ok(await this.userLoginService.password(body.phone, body.password));
  }
}
