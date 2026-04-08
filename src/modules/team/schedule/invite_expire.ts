import { Provide, Inject, CommonSchedule, TaskLocal, FORMAT } from '@midwayjs/core';
import { ILogger } from '@midwayjs/logger';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import { TeamInviteEntity } from '../entity/invite';
import * as moment from 'moment';

@Provide()
export class TeamInviteExpireSchedule implements CommonSchedule {
  @InjectEntityModel(TeamInviteEntity)
  teamInviteEntity: Repository<TeamInviteEntity>;

  @Inject()
  logger: ILogger;

  @TaskLocal(FORMAT.CRONTAB.EVERY_HOUR)
  async exec() {
    const now = moment().toDate();
    const res = await this.teamInviteEntity
      .createQueryBuilder()
      .update(TeamInviteEntity)
      .set({ status: 1 } as any)
      .where('status = :status', { status: 0 })
      .andWhere('expireTime IS NOT NULL')
      .andWhere('expireTime < :now', { now })
      .execute();
    const affected = (res as any)?.affected ?? 0;
    if (affected > 0) {
      this.logger.info(`团队邀请链接过期自动失效：${affected}条`);
    }
  }
}

