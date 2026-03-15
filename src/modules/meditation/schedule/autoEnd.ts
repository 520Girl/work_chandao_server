import { Job } from '@midwayjs/cron';
import { Provide } from '@midwayjs/core';
import { MeditationSessionService } from '../service/session';
import { Inject } from '@midwayjs/core';

@Provide()
@Job({
  cronTime: '0 * * * * *',
  start: true,
})
export class MeditationAutoEndJob {
  @Inject()
  meditationSessionService: MeditationSessionService;

  async onTick() {
    await this.meditationSessionService.autoEndExpiredDeviceSessions();
  }
}

