import { Body, Inject, Post } from '@midwayjs/core';
import { BaseController, CoolController } from '@cool-midway/core';
import { TeamInfoService } from '../../../team/service/info';
import { UserJoinTeamDTO } from '../../dto/team';
import { Validate } from '@midwayjs/validate';

/**
 * 用户团队
 */
@CoolController({
  prefix: '/app/user',
  api: [],
})
export class AppUserTeamController extends BaseController {
  @Inject()
  ctx;

  @Inject()
  teamInfoService: TeamInfoService;

  @Post('/join-team', { summary: '加入团队' })
  @Validate()
  async joinTeam(@Body() body: UserJoinTeamDTO) {
    return this.ok(await this.teamInfoService.joinTeam(this.ctx.user.id, body.teamId));
  }
}
