import { Get, Inject, Query } from '@midwayjs/core';
import { BaseController, CoolController } from '@cool-midway/core';
import { LeaderboardDurationService } from '../../service/duration';
import { LeaderboardDurationQueryDTO } from '../../dto/duration';

@CoolController({
  prefix: '/admin/leaderboard/duration',
  api: [],
})
export class AdminLeaderboardDurationController extends BaseController {
  @Inject()
  leaderboardDurationService: LeaderboardDurationService;

  @Get('/page', { summary: '总时长排行榜分页' })
  async durationPage(@Query() query: LeaderboardDurationQueryDTO) {
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
