import { Inject, Post, Body } from '@midwayjs/core';
import { BaseController, CoolController } from '@cool-midway/core';
import { ActivityInfoService } from '../../service/info';
import { ActivityJoinDTO } from '../../dto/activity';
import { Validate } from '@midwayjs/validate';

/**
 * 活动参与
 */
@CoolController({
  prefix: '/app/activity',
  api: [],
})
export class AppActivityController extends BaseController {
  @Inject()
  ctx;

  @Inject()
  activityInfoService: ActivityInfoService;

  @Post('/join', { summary: '参加活动' })
  @Validate()
  async join(@Body() body: ActivityJoinDTO) {
    return this.ok(await this.activityInfoService.joinActivity(this.ctx.user.id, body.id));
  }
}
