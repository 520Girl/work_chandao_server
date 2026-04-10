import { Body, Get, Inject, Post, Query } from '@midwayjs/core';
import { BaseController, CoolController } from '@cool-midway/core';
import { TeamMemberService } from '../../service/member';
import { AppTeamMemberPageQueryDTO } from '../../dto/member';
import { AppTeamRemoveMemberDTO } from '../../dto/member_action';
import { Validate } from '@midwayjs/validate';

@CoolController({
  prefix: '/app/team/member',
  api: [],
})
export class AppTeamMemberController extends BaseController {
  @Inject()
  ctx;

  @Inject()
  teamMemberService: TeamMemberService;

  @Get('/page', { summary: '团队成员分页（我所在团队）' })
  async memberPage(@Query() query: AppTeamMemberPageQueryDTO) {
    return this.ok(
      await this.teamMemberService.appMemberPage(this.ctx.user.id, query as any)
    );
  }

  @Post('/remove', { summary: '移除团队成员（负责人）' })
  @Validate()
  async removeMember(@Body() body: AppTeamRemoveMemberDTO) {
    await this.teamMemberService.removeByOwner(
      this.ctx.user.id,
      Number(body.teamId),
      Number(body.userId)
    );
    return this.ok();
  }
}
