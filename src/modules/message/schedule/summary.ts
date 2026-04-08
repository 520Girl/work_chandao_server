import { Provide, Inject, CommonSchedule, TaskLocal } from '@midwayjs/core';
import { ILogger } from '@midwayjs/logger';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import { PostLikeEntity } from '../../post/entity/like';
import { PostInfoEntity } from '../../post/entity/info';
import { MessageInfoService } from '../service/info';
import * as moment from 'moment';

/**
 * 社群动态点赞每日总结任务
 * 每天早上 8:00 执行
 */
@Provide()
export class PostLikeSummarySchedule implements CommonSchedule {
  @InjectEntityModel(PostLikeEntity)
  postLikeEntity: Repository<PostLikeEntity>;

  @Inject()
  messageInfoService: MessageInfoService;

  @Inject()
  logger: ILogger;

  @TaskLocal('0 0 8 * * *')
  async exec() {
    this.logger.info('社群动态点赞总结任务开始执行');
    const startTime = Date.now();

    // 统计过去 24 小时（昨天 8:00 到今天 8:00）的点赞
    const end = moment().startOf('day').add(8, 'hours').toDate();
    const start = moment(end).subtract(24, 'hours').toDate();

    // 查询所有被点赞的动态及其作者
    const likes = await this.postLikeEntity
      .createQueryBuilder('l')
      .innerJoin(PostInfoEntity, 'p', 'l.postId = p.id')
      .select('p.userId', 'userId')
      .addSelect('COUNT(l.id)', 'count')
      .where('l.createTime BETWEEN :start AND :end', { start, end })
      .groupBy('p.userId')
      .getRawMany();

    this.logger.info(`查询到 ${likes.length} 位作者收到点赞`);

    for (const item of likes) {
      const userId = Number(item.userId);
      const count = Number(item.count);

      if (count > 0) {
        try {
          await this.messageInfoService.sendSystemToUsers({
            templateKey: 'POST_LIKE_SUMMARY',
            templateParams: {
              count,
              date: moment(start).format('YYYY-MM-DD'),
            },
            targetType: 1,
            userIds: [userId],
            bizType: 'post_like_summary',
            contentType: 0,
          });
        } catch (e) {
          this.logger.error(`发送点赞总结消息失败 [userId=${userId}]:`, e);
        }
      }
    }

    this.logger.info(
      `社群动态点赞总结任务结束，耗时:${Date.now() - startTime}ms`
    );
  }
}
