import { Inject, Post, Body, Get, Query } from '@midwayjs/core';
import { BaseController, CoolController, CoolTag, TagTypes } from '@cool-midway/core';
import { ActivityInfoService } from '../../service/info';
import {
  ActivityAppPageQueryDTO,
  ActivityCheckinDTO,
  ActivityJoinDTO,
  AppActivityCreateFromTemplateDTO,
  ActivityRoomReadyDTO,
  ActivityRoomIdDTO,
} from '../../dto/activity';
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

  @Get('/templates', { summary: '活动模板列表（团队负责人发布用）' })
  async templates() {
    return this.ok(await this.activityInfoService.appTemplateOptions());
  }

  @Post('/createFromTemplate', { summary: '团队负责人从模板创建本团队活动' })
  @Validate()
  async createFromTemplate(@Body() body: AppActivityCreateFromTemplateDTO) {
    return this.ok(
      await this.activityInfoService.createTeamActivityFromTemplate(this.ctx.user.id, body)
    );
  }

  @Get('/page', {
    summary:
      '活动列表（分页；onlyJoined=0 为团队+全局全部活动并含 isJoined，默认 onlyJoined=1 仅已报名）',
  })
  @Validate()
  async pageGet(@Query() query: ActivityAppPageQueryDTO) {
    return this.ok(await this.activityInfoService.appPage(query));
  }

  @Post('/page', { summary: '活动列表（分页，POST Body 兼容；参数同 GET /page）' })
  @Validate()
  async activityPage(@Body() body: ActivityAppPageQueryDTO) {
    return this.ok(await this.activityInfoService.appPage(body ?? {}));
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

  @Post('/ready', { summary: '多人共修：设置是否就绪' })
  @Validate()
  async roomReady(@Body() body: ActivityRoomReadyDTO) {
    return this.ok(
      await this.activityInfoService.setRoomReady(this.ctx.user.id, body.id, Number(body.ready) === 1)
    );
  }

  /**
   * 客户端与本接口返回的 serverTime 求差得到 offset，用 Date.now()+offset 显示倒计时；
   * 可与 roomState 内的 serverTime、提示字段配合做开场/收场提示。
   */
  @CoolTag(TagTypes.IGNORE_TOKEN)
  @Get('/serverTime', { summary: '服务端当前时间（毫秒时间戳，客户端时钟校正）' })
  async serverTime() {
    return this.ok({ serverTime: Date.now() });
  }

  @Get('/roomState', { summary: '多人共修：房间状态' })
  @Validate()
  async roomState(@Query() query: ActivityRoomIdDTO) {
    return this.ok(await this.activityInfoService.getRoomState(this.ctx.user.id, query.id));
  }

  @Get('/roomResult', { summary: '多人共修：房间排行榜结果' })
  @Validate()
  async roomResult(@Query() query: ActivityRoomIdDTO) {
    return this.ok(await this.activityInfoService.getRoomResult(this.ctx.user.id, query.id));
  }
}
