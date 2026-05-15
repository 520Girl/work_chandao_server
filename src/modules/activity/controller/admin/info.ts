import { Body, Inject, Post } from '@midwayjs/core';
import { BaseController, CoolController } from '@cool-midway/core';
import { ActivityInfoEntity } from '../../entity/info';
import { ActivityTemplateEntity } from '../../entity/template';
import { TeamInfoEntity } from '../../../team/entity/info';
import { ActivityInfoService } from '../../service/info';
import { Validate } from '@midwayjs/validate';
import { ActivityCreateDTO, ActivityUpdateDTO, ActivityAssignTeamDTO } from '../../dto/admin';

/**
 * 活动管理
 */
@CoolController({
  prefix: '/admin/activity/info',
  // 勿包含 update：默认 CRUD update 只改表，不会走 ActivityInfoService.updateActivity（草稿→发布不发 ACTIVITY_PUBLISHED）。
  // 统一使用下方自定义 POST /update → updateActivity。
  api: ['delete', 'list', 'page'],
  entity: ActivityInfoEntity,
  // 勿在此写死 status：会与请求体合并并覆盖前端选择的「发布」，导致永远存为草稿
  insertParam: ctx => ({ authorId: ctx.admin.userId }),
  pageQueryOp: {
    keyWordLikeFields: ['a.title', 'b.name'],
    fieldEq: ['a.status', 'a.teamId'],
    select: ['a.*', 'b.name as templateName', 'b.icon as templateIcon', 'c.name as teamName'],
    join: [
      {
        entity: ActivityTemplateEntity,
        alias: 'b',
        condition: 'a.templateId = b.id',
      },
      {
        entity: TeamInfoEntity,
        alias: 'c',
        condition: 'a.teamId = c.id',
        type: 'leftJoin',
      },
    ],
  },
})
export class AdminActivityInfoController extends BaseController {
  @Inject()
  ctx;

  @Inject()
  activityInfoService: ActivityInfoService;

  @Post('/add', { summary: '新增活动（支持直接发布并触发通知）' })
  @Validate()
  async addActivity(@Body() body: ActivityCreateDTO) {
    const addData: any = { ...body };
    if (addData.startDate) addData.startDate = new Date(addData.startDate);
    if (addData.endDate) addData.endDate = new Date(addData.endDate);
    if (addData.isTop !== undefined) addData.isTop = addData.isTop ? 1 : 0;
    addData.authorId = this.ctx.admin.userId;
    const row = await this.activityInfoService.add(addData);
    return this.ok(row);
  }

  @Post('/info', { summary: '活动详情（含模板名、团队名）' })
  async activityDetail(@Body() body: any) {
    const id = body?.id ?? body;
    if (id == null) return this.fail('缺少 id');
    const row = await this.activityInfoService.getInfoWithJoin(Number(id));
    if (!row) return this.fail('活动不存在');
    return this.ok(row);
  }

  @Post('/update', { summary: '编辑活动' })
  @Validate()
  async updateActivity(@Body() body: ActivityUpdateDTO) {
    const updateData: any = { ...body };
    delete updateData.id;
    delete updateData.tenantId;
    if (updateData.startDate) updateData.startDate = new Date(updateData.startDate);
    if (updateData.endDate) updateData.endDate = new Date(updateData.endDate);
    if (updateData.isTop !== undefined) updateData.isTop = updateData.isTop ? 1 : 0;
    await this.activityInfoService.updateActivity(
      this.ctx.admin.userId,
      body.id,
      updateData,
      { skipAuthorCheck: true }
    );
    return this.ok();
  }

  @Post('/assignTeam', { summary: '分配活动团队' })
  @Validate()
  async assignTeam(@Body() body: ActivityAssignTeamDTO) {
    await this.activityInfoService.assignTeam(this.ctx.admin.userId, body.id, body.teamId ?? null);
    return this.ok();
  }

  @Post('/page', { summary: '活动列表（含打卡统计）' })
  async pageWithStats() {
    const res = (await super.page()) as any;
    if (res?.code === 1000 && res?.data?.list?.length) {
      for (const row of res.data.list) {
        const stats = await this.activityInfoService.getCheckinStats(row.id);
        row.totalParticipants = stats.totalParticipants;
        row.todayCheckinCount = stats.todayCheckinCount;
      }
    }
    return res;
  }

  @Post('/checkinStats', { summary: '活动打卡统计' })
  async checkinStats(@Body() body: any) {
    const stats = await this.activityInfoService.getCheckinStats(body?.activityId);
    return this.ok(stats);
  }
}
