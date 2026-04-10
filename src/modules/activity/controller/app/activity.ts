import { Inject, Post, Body, Get } from '@midwayjs/core';
import { BaseController, CoolController } from '@cool-midway/core';
import { ActivityInfoService } from '../../service/info';
import { ActivityCheckinDTO, ActivityJoinDTO } from '../../dto/activity';
import { Validate } from '@midwayjs/validate';

/**
 * 活动（App 端）
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

  @Post('/page', { summary: '活动列表（分页）' })
  async page(@Body() body = {}) {
    return this.ok(await this.activityInfoService.appPage(body));
  }

  @Get('/info', { summary: '活动详情' })
  async info() {
    const id = this.ctx.query.id;
    const activity = await this.activityInfoService.appInfo(Number(id));
    const stats = await this.activityInfoService.getCheckinStats(Number(id));
    return this.ok({ ...activity, checkinStats: stats });
  }

  @Get('/checkinStats', { summary: '活动打卡统计' })
  async checkinStats() {
    const id = this.ctx.query.id;
    const stats = await this.activityInfoService.getCheckinStats(Number(id));
    return this.ok(stats);
  }

  @Post('/join', { summary: '参加活动' })
  @Validate()
  async join(@Body() body: ActivityJoinDTO) {
    return this.ok(await this.activityInfoService.joinActivity(this.ctx.user.id, body.id));
  }

  @Post('/checkin', { summary: '活动打卡' })
  @Validate()
  async checkin(@Body() body: ActivityCheckinDTO) {
    await this.activityInfoService.checkinActivity(this.ctx.user.id, body.id, body, 1);
    return this.ok();
  }
}
