import { Body, Inject, Post, Put } from '@midwayjs/core';
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
    return this.ok(await this.postInfoService.share(this.ctx.user.id, body.reportId));
  }

  @Post('/manual', { summary: '管理员手动发布' })
  @Validate()
  async manual(@Body() body: PostManualDTO) {
    const { content, images } = body;
    return this.ok(
      await this.postInfoService.manual(this.ctx.user.id, content, images)
    );
  }

  @Put('/update', { summary: '编辑手动动态' })
  @Validate()
  async updateManual(@Body() body: PostUpdateDTO) {
    const { id, content, images } = body;
    await this.postInfoService.updateManual(this.ctx.user.id, id, content, images);
    return this.ok();
  }

  @Post('/like', { summary: '点赞' })
  @Validate()
  async like(@Body() body: PostLikeDTO) {
    await this.postInfoService.like(this.ctx.user.id, body.id);
    return this.ok();
  }
}
