import { Get, Inject, Query } from '@midwayjs/core';
import { BaseController, CoolController } from '@cool-midway/core';
import { LeaderboardScoreService } from '../../service/score';
import { LeaderboardScoreQueryDTO } from '../../dto/score';

@CoolController({
  prefix: '/app/leaderboard',
  api: [],
})
export class AppLeaderboardScoreController extends BaseController {
  @Inject()
  leaderboardScoreService: LeaderboardScoreService;

  @Get('/score', { summary: '综合排行榜' })
  async score(@Query() query: LeaderboardScoreQueryDTO) {
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
