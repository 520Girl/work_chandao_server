import { Body, Inject, Post, Put } from '@midwayjs/core';
import { BaseController, CoolController } from '@cool-midway/core';
import { ActivityInfoService } from '../../service/info';
import { Validate } from '@midwayjs/validate';
import { ActivityCreateDTO, ActivityUpdateDTO } from '../../dto/admin';

/**
 * 活动管理
 */
@CoolController({
  prefix: '/admin/activity',
  api: [],
})
export class AdminActivityController extends BaseController {
  @Inject()
  ctx;

  @Inject()
  activityInfoService: ActivityInfoService;

  @Post('/create', { summary: '发布活动' })
  @Validate()
  async create(@Body() body: ActivityCreateDTO) {
    const { templateId, title, startDate, endDate, content, isTop } = body;
    return this.ok(
      await this.activityInfoService.createActivity(
        this.ctx.admin.userId,
        templateId,
        title,
        startDate ? new Date(startDate) : null,
        endDate ? new Date(endDate) : null,
        content,
        isTop ? 1 : 0
      )
    );
  }

  @Put('/update', { summary: '编辑活动' })
  @Validate()
  async updateActivity(@Body() body: ActivityUpdateDTO) {
    const updateData: any = { ...body };
    delete updateData.id;
    if (updateData.startDate) updateData.startDate = new Date(updateData.startDate);
    if (updateData.endDate) updateData.endDate = new Date(updateData.endDate);
    if (updateData.isTop !== undefined) updateData.isTop = updateData.isTop ? 1 : 0;
    await this.activityInfoService.updateActivity(
      this.ctx.admin.userId,
      body.id,
      updateData
    );
    return this.ok();
  }
}
