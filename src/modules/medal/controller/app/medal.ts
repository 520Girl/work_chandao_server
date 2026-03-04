
import { CoolController, BaseController } from '@cool-midway/core';
import { Inject, Post, Body, Get } from '@midwayjs/core';
import { MedalAwardService } from '../../service/award';
import { MedalTemplateEntity } from '../../entity/template';

/**
 * 勋章相关接口
 */
@CoolController({
  api: [],
  entity: MedalTemplateEntity
})
export class AppMedalController extends BaseController {
  @Inject()
  medalAwardService: MedalAwardService;

  @Inject()
  ctx;

  @Get('/user-medals', { summary: '获取我的勋章' })
  async myMedals() {
    return this.ok(await this.medalAwardService.getUserMedals(this.ctx.user.id));
  }

  @Get('/templates', { summary: '获取所有勋章模板' })
  async templates() {
      // 获取所有激活的模板
      return this.ok(await this.medalAwardService.medalTemplateEntity.findBy({ isActive: 1 }));
  }
}
