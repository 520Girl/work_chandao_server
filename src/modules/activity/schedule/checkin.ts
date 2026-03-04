import { Job } from '@midwayjs/cron';
import { Provide } from '@midwayjs/core';
import { ActivityInfoService } from '../service/info';
import { Inject } from '@midwayjs/core';

/**
 * 每日打卡检查
 */
@Provide()
@Job({
  cronTime: '0 0 9 * * *',
  start: true,
})
export class ActivityCheckinJob {
  @Inject()
  activityInfoService: ActivityInfoService;

  async onTick() {
    await this.activityInfoService.checkDailyCheckin();
  }
}
