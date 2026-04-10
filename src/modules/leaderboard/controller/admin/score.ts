import { Get, Inject, Query } from '@midwayjs/core';
import { BaseController, CoolController } from '@cool-midway/core';
import { LeaderboardScoreService } from '../../service/score';
import { LeaderboardScoreQueryDTO } from '../../dto/score';

@CoolController({
  prefix: '/admin/leaderboard/score',
  api: [],
})
export class AdminLeaderboardScoreController extends BaseController {
  @Inject()
  leaderboardScoreService: LeaderboardScoreService;

  @Get('/page', { summary: '综合排行榜分页' })
  async scorePage(@Query() query: LeaderboardScoreQueryDTO) {
    return this.ok(
      await this.leaderboardScoreService.page({
        range: query?.range,
        teamId: query?.teamId,
        page: query?.page,
        size: query?.size,
      })
    );
  }
}
