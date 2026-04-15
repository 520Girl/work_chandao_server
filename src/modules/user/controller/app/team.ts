import { Body, Get, Inject, Post, Query } from '@midwayjs/core';
import { BaseController, CoolController } from '@cool-midway/core';
import { TeamInviteService } from '../../../team/service/invite';
import { TeamMemberService } from '../../../team/service/member';
import {
  UserJoinByInviteDTO,
  UserQuitTeamDTO,
  UserCreateTeamInviteDTO,
  UserCreatePersonalInviteDTO,
} from '../../dto/team';
import { Validate } from '@midwayjs/validate';

/**
 * 用户团队（仅支持邀请加入，不支持主动搜索加入）
 */
@CoolController({
  prefix: '/app/user',
  api: [],
})
export class AppUserTeamController extends BaseController {
  @Inject()
  ctx;

  @Inject()
  teamInviteService: TeamInviteService;

  @Inject()
  teamMemberService: TeamMemberService;

  @Post('/joinByInvite', { summary: '通过邀请码加入团队' })
  @Validate()
  async joinByInvite(@Body() body: UserJoinByInviteDTO) {
    return this.ok(await this.teamInviteService.joinByInvite(this.ctx.user.id, body.code));
  }

  @Post('/createTeamInvite', { summary: '负责人创建团队邀请（加入已有团队）' })
  @Validate()
  async createTeamInvite(@Body() body: UserCreateTeamInviteDTO) {
    const result = await this.teamInviteService.createTeamInviteForApp(
      this.ctx.user.id,
      body.teamId,
      body.days ?? 7,
      body.bindUserId ?? null
    );
    const finished = await this.teamInviteService.finishCreateInviteWithOptionalQr(result);
    return this.ok({
      ...finished,
      url: `/invite?code=${finished.code}`,
    });
  }

  @Post('/createPersonalInvite', { summary: '创建个人成团邀请（人满自动建团）' })
  @Validate()
  async createPersonalInvite(@Body() body: UserCreatePersonalInviteDTO) {
    const result = await this.teamInviteService.createPersonalInviteForApp(
      this.ctx.user.id,
      body.days ?? 7,
      body.bindUserId ?? null
    );
    const finished = await this.teamInviteService.finishCreateInviteWithOptionalQr(result);
    return this.ok({
      ...finished,
      url: `/invite?code=${finished.code}`,
    });
  }

  @Post('/quitTeam', { summary: '主动退出团队' })
  @Validate()
  async quitTeam(@Body() body: UserQuitTeamDTO) {
    await this.teamMemberService.quit(this.ctx.user.id, body.teamId);
    return this.ok();
  }

  @Get('/myTeams', { summary: '我的团队列表' })
  async myTeams(@Query('status') status: number = 0) {
    return this.ok(
      await this.teamMemberService.myTeams(this.ctx.user.id, status)
    );
  }
}
