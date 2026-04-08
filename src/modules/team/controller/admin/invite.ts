import { Body, Inject, Post } from '@midwayjs/core';
import { CoolController, BaseController } from '@cool-midway/core';
import { TeamInviteEntity } from '../../entity/invite';
import { TeamInfoEntity } from '../../entity/info';
import { BaseSysUserEntity } from '../../../base/entity/sys/user';
import { TeamInviteService } from '../../service/invite';
import { Context } from '@midwayjs/koa';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import { TeamInviteJoinEntity } from '../../entity/invite_join';
import { UserInfoEntity } from '../../../user/entity/info';

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

  @InjectEntityModel(TeamInviteJoinEntity)
  teamInviteJoinEntity: Repository<TeamInviteJoinEntity>;

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

  @Post('/invalidate', { summary: '失效邀请链接' })
  async invalidate(@Body('id') id: number) {
    await this.teamInviteService.teamInviteEntity.update(Number(id), { status: 1 } as any);
    return this.ok();
  }

  @Post('/joinedUsers', { summary: '邀请链接已加入用户' })
  async joinedUsers(@Body('inviteId') inviteId: number) {
    const rows = await this.teamInviteJoinEntity
      .createQueryBuilder('j')
      .leftJoin(UserInfoEntity, 'u', 'j.userId = u.id')
      .where('j.inviteId = :inviteId', { inviteId: Number(inviteId) })
      .select([
        'j.id as id',
        'j.inviteId as inviteId',
        'j.userId as userId',
        'j.createTime as joinTime',
        'u.nickName as nickName',
        'u.phone as phone',
        'u.avatarUrl as avatarUrl',
      ])
      .orderBy('j.id', 'DESC')
      .getRawMany();
    return this.ok(rows);
  }
}
