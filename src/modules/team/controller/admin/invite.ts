import { Body, Inject, Post } from '@midwayjs/core';
import { CoolController, BaseController } from '@cool-midway/core';
import { TeamInviteEntity } from '../../entity/invite';
import { TeamInfoEntity } from '../../entity/info';
import { BaseSysUserEntity } from '../../../base/entity/sys/user';
import { TeamInviteService } from '../../service/invite';
import { Context } from '@midwayjs/koa';

/**
 * 团队邀请管理
 */
@CoolController({
  api: ['page', 'info', 'list'],
  entity: TeamInviteEntity,
  pageQueryOp: {
    keyWordLikeFields: ['a.code'],
    fieldEq: ['a.teamId', 'a.status', 'a.creatorId'],
    select: ['a.*', 'b.name as teamName', 'c.nickName as creatorName'],
    join: [
      {
        entity: TeamInfoEntity,
        alias: 'b',
        condition: 'a.teamId = b.id',
      },
      {
        entity: BaseSysUserEntity,
        alias: 'c',
        condition: 'a.creatorId = c.id',
        type: 'leftJoin',
      },
    ],
  },
})
export class AdminTeamInviteController extends BaseController {
  @Inject()
  teamInviteService: TeamInviteService;

  @Inject()
  ctx: Context;

  /** 创建人 = 当前登录的管理员 (ctx.admin.userId，即 base_sys_user.id) */
  @Post('/createInvite', { summary: '创建邀请链接' })
  async createInvite(
    @Body('teamId') teamId: number,
    @Body('days') days: number = 7
  ) {
    const creatorId = this.ctx.admin?.userId;
    const result = await this.teamInviteService.genInviteCode(
      teamId,
      creatorId || 0,
      days
    );
    return this.ok({
      ...result,
      url: `/invite?code=${(result as any).code}`,
    });
  }
}
