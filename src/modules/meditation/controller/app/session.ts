import { Body, Get, Inject, Post } from '@midwayjs/core';
import { BaseController, CoolController } from '@cool-midway/core';
import { MeditationSessionService } from '../../service/session';
import { MeditationStartDTO, MeditationEndDTO } from '../../dto/session';
import { Validate } from '@midwayjs/validate';

/**
 * 冥想会话
 */
@CoolController({
  prefix: '/app/meditation',
  api: [],
})
export class AppMeditationSessionController extends BaseController {
  @Inject()
  ctx;

  @Inject()
  meditationSessionService: MeditationSessionService;

  @Post('/start', { summary: '开始冥想' })
  @Validate()
  async start(@Body() body: MeditationStartDTO) {
    const { sn, targetDuration, type } = body;
    return this.ok(
      await this.meditationSessionService.start(
        this.ctx.user.id,
        sn,
        targetDuration,
        type
      )
    );
  }

  @Post('/end', { summary: '结束冥想' })
  @Validate()
  async end(@Body() body: MeditationEndDTO) {
    return this.ok(
      await this.meditationSessionService.end(this.ctx.user.id, body.sessionId)
    );
  }

  @Get('/report/history', { summary: '报告历史' })
  async reportHistory() {
    return this.ok(
      await this.meditationSessionService.reportHistory(this.ctx.user.id)
    );
  }
}
