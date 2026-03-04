
import { CoolController, BaseController } from '@cool-midway/core';
import { Body, Get, Inject, Post } from '@midwayjs/core';
import { UserInfoService } from '../../service/info';
import { UserInfoEntity } from '../../entity/info';
import { Validate } from '@midwayjs/validate';
import {
  UserUpdatePersonDTO,
  UserUpdatePasswordDTO,
  UserBindPhoneDTO,
  UserMiniPhoneDTO,
} from '../../dto/info';
import { TeamInfoService } from '../../../team/service/info';

/**
 * 用户信息
 */
@CoolController({
  api: [],
  entity: UserInfoEntity,
})
export class AppUserInfoController extends BaseController {
  @Inject()
  ctx;

  @Inject()
  userInfoService: UserInfoService;

  @Inject()
  teamInfoService: TeamInfoService;

  @Get('/person', { summary: '获取用户信息' })
  async person() {
    return this.ok(await this.userInfoService.person(this.ctx.user.id));
  }

  @Post('/joinTeam', { summary: '加入团队' })
  async joinTeam(@Body('teamId') teamId: number, @Body('invitedBy') invitedBy?: number) {
    return this.ok(
      await this.teamInfoService.joinTeam(this.ctx.user.id, teamId, invitedBy)
    );
  }

  @Post('/updatePerson', { summary: '更新用户信息' })
  @Validate()
  async updatePerson(@Body() body: UserUpdatePersonDTO) {
    return this.ok(
      await this.userInfoService.updatePerson(this.ctx.user.id, body)
    );
  }

  @Post('/updatePassword', { summary: '更新用户密码' })
  @Validate()
  async updatePassword(@Body() body: UserUpdatePasswordDTO) {
    await this.userInfoService.updatePassword(
      this.ctx.user.id,
      body.password,
      body.code
    );
    return this.ok();
  }

  @Post('/logoff', { summary: '注销' })
  async logoff() {
    await this.userInfoService.logoff(this.ctx.user.id);
    return this.ok();
  }

  @Post('/bindPhone', { summary: '绑定手机号' })
  @Validate()
  async bindPhone(@Body() body: UserBindPhoneDTO) {
    await this.userInfoService.bindPhone(
      this.ctx.user.id,
      body.phone,
      body.code
    );
    return this.ok();
  }

  @Post('/miniPhone', { summary: '绑定小程序手机号' })
  @Validate()
  async miniPhone(@Body() body: UserMiniPhoneDTO) {
    const { code, encryptedData, iv } = body;
    return this.ok(
      await this.userInfoService.miniPhone(
        this.ctx.user.id,
        code,
        encryptedData,
        iv
      )
    );
  }
}
