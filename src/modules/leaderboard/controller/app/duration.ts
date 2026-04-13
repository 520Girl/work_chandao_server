import { Get, Inject, Query } from '@midwayjs/core';
import { BaseController, CoolController } from '@cool-midway/core';
import { LeaderboardDurationService } from '../../service/duration';
import { LeaderboardDurationQueryDTO } from '../../dto/duration';

@CoolController({
  prefix: '/app/leaderboard',
  api: [],
})
export class AppLeaderboardDurationController extends BaseController {
  @Inject()
  leaderboardDurationService: LeaderboardDurationService;

  @Get('/duration', { summary: '总时长排行榜分页' })
  async duration(@Query() query: LeaderboardDurationQueryDTO) {
    return this.ok(
      await this.leaderboardDurationService.page({
        range: query?.range,
        teamId: query?.teamId,
        page: query?.page,
        size: query?.size,
      })
    );
  }
}

