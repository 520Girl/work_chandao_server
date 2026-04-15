import { Body, Inject, Post } from '@midwayjs/core';
import { CoolController, BaseController } from '@cool-midway/core';
import { TeamInviteEntity } from '../../entity/invite';
import { TeamInfoEntity } from '../../entity/info';
import { BaseSysUserEntity } from '../../../base/entity/sys/user';
import { TeamInviteService, TEAM_INVITE_MODE_PERSONAL } from '../../service/invite';
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
    fieldEq: ['a.teamId', 'a.status', 'a.creatorId', 'a.inviteMode', 'a.sponsorUserId'],
    select: ['a.*', 'b.name as teamName', 'c.nickName as creatorName'],
    join: [
      {
        entity: TeamInfoEntity,
        alias: 'b',
        condition: 'a.teamId = b.id',
        type: 'leftJoin',
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

  /**
   * 创建邀请：团队邀请 inviteMode=0（默认）需 teamId；
   * 个人成团 inviteMode=1 需 sponsorUserId（发起人 user_info.id），可选 bindUserId。
   */
  @Post('/createInvite', { summary: '创建邀请链接' })
  async createInvite(
    @Body('inviteMode') inviteMode: number = 0,
    @Body('teamId') teamId: number,
    @Body('sponsorUserId') sponsorUserId: number,
    @Body('bindUserId') bindUserId: number,
    @Body('days') days: number = 7
  ) {
    const creatorId = this.ctx.admin?.userId || 0;
    const d = Number(days) > 0 ? Number(days) : 7;
    let result: { id: number; code: string; expireTime: Date };
    if (Number(inviteMode) === TEAM_INVITE_MODE_PERSONAL) {
      if (!sponsorUserId) {
        return this.fail('个人成团需传 sponsorUserId（发起人用户 ID）');
      }
      result = await this.teamInviteService.createInviteRecord({
        inviteMode: TEAM_INVITE_MODE_PERSONAL,
        teamId: null,
        creatorId,
        creatorAppUserId: null,
        sponsorUserId: Number(sponsorUserId),
        bindUserId: bindUserId != null ? Number(bindUserId) : null,
        days: d,
      });
    } else {
      if (!teamId) {
        return this.fail('请选择团队');
      }
      result = await this.teamInviteService.createInviteRecord({
        inviteMode: 0,
        teamId: Number(teamId),
        creatorId,
        creatorAppUserId: null,
        sponsorUserId: null,
        bindUserId: bindUserId != null ? Number(bindUserId) : null,
        days: d,
      });
    }
    const finished = await this.teamInviteService.finishCreateInviteWithOptionalQr(result);
    const code = finished.code;
    if (!finished.miniProgramQrUrl) {
      this.ctx.logger?.warn?.(`[createInvite] 小程序码未生成 code=${code}`);
    }
    return this.ok({
      ...finished,
      url: `/invite?code=${code}`,
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
