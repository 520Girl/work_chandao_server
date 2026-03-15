import { Body, Inject, Post } from '@midwayjs/core';
import { CoolController, BaseController, CoolCommException } from '@cool-midway/core';
import { TeamMemberEntity } from '../../entity/member';
import { TeamInfoEntity } from '../../entity/info';
import { UserInfoEntity } from '../../../user/entity/info';
import { TeamMemberService } from '../../service/member';
import { Context } from '@midwayjs/koa';

/**
 * 团队成员管理
 */
@CoolController({
  api: ['page', 'info', 'list', 'delete'],
  entity: TeamMemberEntity,
  pageQueryOp: {
    where: async ctx => {
      const params = ctx.req.method === 'GET' ? ctx.request.query : ctx.request.body;
      if (Number(params?.showExitedOnly) === 1) {
        return [['a.exitType != :activeExitType', { activeExitType: 0 }]];
      }
      return [];
    },
    keyWordLikeFields: ['b.name', 'c.nickName'],
    fieldEq: ['a.teamId', 'a.userId', 'a.exitType'],
    select: ['a.*', 'b.name as teamName', 'c.nickName as userName', 'c.avatarUrl as userAvatar', 'c.phone'],
    join: [
      {
        entity: TeamInfoEntity,
        alias: 'b',
        condition: 'a.teamId = b.id',
      },
      {
        entity: UserInfoEntity,
        alias: 'c',
        condition: 'a.userId = c.id',
      },
    ],
  },
})
export class AdminTeamMemberController extends BaseController {
  @Inject()
  teamMemberService: TeamMemberService;

  @Inject()
  ctx: Context;

  @Post('/addMember', { summary: '管理员添加成员' })
  async addMember(
    @Body('teamId') teamId: number,
    @Body('userId') userId: number
  ) {
    await this.teamMemberService.join(userId, teamId);
    return this.ok();
  }

  @Post('/addMembers', { summary: '管理员批量添加成员' })
  async addMembers(
    @Body('teamId') teamId: number,
    @Body('userIds') userIds: number[]
  ) {
    if (!Array.isArray(userIds) || userIds.length === 0) {
      throw new CoolCommException('请选择要添加的用户');
    }
    for (const userId of userIds) {
      try {
        await this.teamMemberService.join(userId, teamId);
      } catch (e) {
        // 已存在则跳过
      }
    }
    return this.ok();
  }

  @Post('/removeMember', { summary: '管理员移除成员' })
  async removeMember(
    @Body('teamId') teamId: number,
    @Body('userId') userId: number
  ) {
    const operatorId = this.ctx.admin?.userId;
    await this.teamMemberService.remove(operatorId || 0, userId, teamId);
    return this.ok();
  }
}
