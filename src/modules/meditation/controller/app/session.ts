import { Body, Get, Inject, Post, Query } from '@midwayjs/core';
import { BaseController, CoolController } from '@cool-midway/core';
import { MeditationSessionService } from '../../service/session';
import {
  MeditationStartDTO,
  MeditationEndDTO,
  MeditationPollDTO,
  MeditationDataListDTO,
  MeditationReportHistoryPageDTO,
  MeditationReportDetailDTO,
  MeditationReportStatisticsDTO,
} from '../../dto/session';
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
    return this.ok(await this.meditationSessionService.endStatus(this.ctx.user.id, body.sessionId));
  }

  @Post('/poll', { summary: '轮询冥想状态' })
  @Validate()
  async poll(@Body() body: MeditationPollDTO) {
    return this.ok(
      await this.meditationSessionService.poll(this.ctx.user.id, body.sessionId)
    );
  }

  @Get('/report/history', { summary: '报告历史' })
  async reportHistory(@Query('page') pageRaw: any, @Query('size') sizeRaw: any) {
    const page = Number(pageRaw ?? 0) || 0;
    const size = Number(sizeRaw ?? 0) || 0;
    if (page > 0 || size > 0) {
      return this.ok(
        await this.meditationSessionService.reportHistoryPage(
          this.ctx.user.id,
          page || 1,
          size || 20
        )
      );
    }
    return this.ok(await this.meditationSessionService.reportHistory(this.ctx.user.id));
  }

  @Get('/report/detail', { summary: '某次冥想报告详情' })
  @Validate()
  async reportDetail(@Query() query: MeditationReportDetailDTO) {
    return this.ok(
      await this.meditationSessionService.reportDetail(
        this.ctx.user.id,
        query.sessionId
      )
    );
  }

  @Get('/report/statistics', { summary: '冥想统计对比数据' })
  @Validate()
  async reportStatistics(@Query() query: MeditationReportStatisticsDTO) {
    return this.ok(
      await this.meditationSessionService.reportStatistics(
        this.ctx.user.id,
        query.range
      )
    );
  }

  @Get('/data/list', { summary: '获取某次会话的详细生理数据' })
  @Validate()
  async dataList(@Query() query: MeditationDataListDTO) {
    return this.ok(
      await this.meditationSessionService.getSessionDataList(this.ctx.user.id, query.sessionId)
    );
  }
}
