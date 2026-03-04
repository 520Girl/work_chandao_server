
import { CoolController, BaseController } from '@cool-midway/core';
import { Inject, Post, Body } from '@midwayjs/core';
import { MedalAwardService } from '../../service/award';
import { UserMedalEntity } from '../../entity/user_medal';
import { UserInfoEntity } from '../../../user/entity/info';
import { MedalTemplateEntity } from '../../entity/template';

/**
 * 勋章发放管理
 */
@CoolController({
  api: ['page', 'delete', 'info', 'list'],
  entity: UserMedalEntity,
  pageQueryOp: {
    keyWordLikeFields: ['b.nickName', 'c.name'],
    fieldEq: ['a.userId', 'a.medalId', 'a.level'],
    select: ['a.*', 'b.nickName', 'b.avatarUrl', 'c.name as medalName', 'c.icon as medalIcon'],
    join: [
        {
            entity: UserInfoEntity,
            alias: 'b',
            condition: 'a.userId = b.id'
        },
        {
            entity: MedalTemplateEntity,
            alias: 'c',
            condition: 'a.medalId = c.id'
        }
    ]
  }
})
export class AdminMedalAwardController extends BaseController {
  @Inject()
  medalAwardService: MedalAwardService;

  @Post('/award', { summary: '手动发放勋章' })
  async award(@Body('userId') userId: number, @Body('medalId') medalId: number) {
    await this.medalAwardService.manualAward(userId, medalId);
    return this.ok();
  }
}
