
import { CoolController, BaseController } from '@cool-midway/core';
import { UserInfoEntity } from '../../entity/info';
import { TeamInfoEntity } from '../../../team/entity/info';
import { UserMedalEntity } from '../../../medal/entity/user_medal';
import { MedalTemplateEntity } from '../../../medal/entity/template';
import { Inject, Post, Body } from '@midwayjs/core';
import { MedalAwardService } from '../../../medal/service/award';

/**
 * 用户管理
 */
@CoolController({
  api: ['add', 'delete', 'update', 'info', 'list', 'page'],
  entity: UserInfoEntity,
  pageQueryOp: {
    keyWordLikeFields: ['a.nickName', 'a.phone'],
    fieldEq: ['a.role', 'a.firstTeamId'],
    select: ['a.*', 'b.name as teamName'],
    join: [
      {
        entity: TeamInfoEntity,
        alias: 'b',
        condition: 'a.firstTeamId = b.id',
      },
    ],
  },
})
export class AdminUserInfoController extends BaseController {
  @Inject()
  medalAwardService: MedalAwardService;

  @Post('/awardMedal', { summary: '手动发放勋章' })
  async awardMedal(@Body('userId') userId: number, @Body('medalId') medalId: number) {
    await this.medalAwardService.manualAward(userId, medalId);
    return this.ok();
  }
}
