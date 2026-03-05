import { Body, Get, Inject, Post, Put, Query } from '@midwayjs/core';
import { BaseController, CoolController } from '@cool-midway/core';
import { PostInfoService } from '../../service/info';
import { PostShareDTO, PostManualDTO, PostUpdateDTO, PostLikeDTO } from '../../dto/info';
import { Validate } from '@midwayjs/validate';

/**
 * 社区动态
 */
@CoolController({
  prefix: '/app/post',
  api: [],
})
export class AppPostInfoController extends BaseController {
  @Inject()
  ctx;

  @Inject()
  postInfoService: PostInfoService;

  @Post('/share', { summary: '分享报告动态' })
  @Validate()
  async share(@Body() body: PostShareDTO) {
    return this.ok(
      await this.postInfoService.share(
        this.ctx.user.id,
        body.reportId,
        body.targetTeamId,
        body.content
      )
    );
  }

  @Post('/manual', { summary: '手动发布动态' })
  @Validate()
  async manual(@Body() body: PostManualDTO) {
    const { content, images, targetTeamId } = body;
    return this.ok(
      await this.postInfoService.manual(this.ctx.user.id, content, images ?? [], targetTeamId)
    );
  }

  @Put('/update', { summary: '编辑手动动态' })
  @Validate()
  async updateManual(@Body() body: PostUpdateDTO) {
    const { id, content, images } = body;
    await this.postInfoService.updateManual(this.ctx.user.id, id, content, images ?? []);
    return this.ok();
  }

  @Get('/feed', { summary: '动态流' })
  async feed(@Query('page') page: number = 1, @Query('size') size: number = 20) {
    return this.ok(await this.postInfoService.feed(this.ctx.user.id, page, size));
  }

  @Post('/like', { summary: '点赞' })
  @Validate()
  async like(@Body() body: PostLikeDTO) {
    await this.postInfoService.like(this.ctx.user.id, body.id);
    return this.ok();
  }
}
