
import { CoolController, BaseController, CoolCommException } from '@cool-midway/core';
import { UserInfoEntity } from '../../entity/info';
import { TeamInfoEntity } from '../../../team/entity/info';
import { UserMedalEntity } from '../../../medal/entity/user_medal';
import { MedalTemplateEntity } from '../../../medal/entity/template';
import { Inject, Post, Body } from '@midwayjs/core';
import { MedalAwardService } from '../../../medal/service/award';
import { UserInfoService } from '../../service/info';

/**
 * 用户管理
 */
@CoolController({
  api: ['add', 'delete', 'update', 'info', 'list', 'page'],
  entity: UserInfoEntity,
  pageQueryOp: {
    keyWordLikeFields: ['a.nickName', 'a.phone'],
    fieldEq: ['a.role', 'a.firstTeamId'],
    select: ['a.*', 'b.name as teamName', 'c.nickName as invitedByName', 'c.phone as invitedByPhone', 'c.avatarUrl as invitedByAvatar'],
    join: [
      {
        entity: TeamInfoEntity,
        alias: 'b',
        condition: 'a.firstTeamId = b.id',
        type: 'leftJoin',
      },
      {
        entity: UserInfoEntity,
        alias: 'c',
        condition: 'a.invitedBy = c.id',
        type: 'leftJoin',
      },
    ],
  },
})
export class AdminUserInfoController extends BaseController {
  @Inject()
  medalAwardService: MedalAwardService;

  @Inject()
  userInfoService: UserInfoService;

  @Post('/update', { summary: '更新用户信息' })
  async update(@Body() body: any = {}) {
    await this.userInfoService.update(body);
    return this.ok();
  }

  @Post('/awardMedal', { summary: '手动发放勋章' })
  async awardMedal(@Body('userId') userId: number, @Body('medalId') medalId: number) {
    await this.medalAwardService.manualAward(userId, medalId);
    return this.ok();
  }

  @Post('/userDetailStats', { summary: '用户详情统计' })
  async userDetailStats(@Body() body: any) {
    const userId = body?.userId ?? body?.id;
    if (!userId) throw new CoolCommException('缺少 userId');
    const stats = await this.userInfoService.userDetailStats(Number(userId));
    return this.ok(stats);
  }
}
