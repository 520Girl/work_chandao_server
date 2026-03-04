
import { Provide } from '@midwayjs/core';
import { BaseService, CoolCommException, CoolEventManager } from '@cool-midway/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import { PostInfoEntity } from '../entity/info';
import { PostLikeEntity } from '../entity/like';
import { MeditationReportEntity } from '../../meditation/entity/report';
import { MeditationSessionEntity } from '../../meditation/entity/session';
import { UserInfoEntity } from '../../user/entity/info';
import { Inject } from '@midwayjs/core';

/**
 * 社区动态服务
 */
@Provide()
export class PostInfoService extends BaseService {
  @InjectEntityModel(PostInfoEntity)
  postInfoEntity: Repository<PostInfoEntity>;

  @InjectEntityModel(PostLikeEntity)
  postLikeEntity: Repository<PostLikeEntity>;

  @InjectEntityModel(MeditationReportEntity)
  meditationReportEntity: Repository<MeditationReportEntity>;

  @InjectEntityModel(MeditationSessionEntity)
  meditationSessionEntity: Repository<MeditationSessionEntity>;

  @InjectEntityModel(UserInfoEntity)
  userInfoEntity: Repository<UserInfoEntity>;

  @Inject()
  coolEventManager: CoolEventManager;

  /**
   * 分享冥想报告
   */
  async share(userId: number, reportId: number) {
    const report = await this.meditationReportEntity.findOneBy({ id: reportId });
    if (!report) {
      throw new CoolCommException('报告不存在');
    }
    const session = await this.meditationSessionEntity.findOneBy({
      id: report.sessionId,
    });
    if (!session || session.userId !== userId) {
      throw new CoolCommException('无权限分享该报告');
    }
    const minutes = Math.floor(report.totalDuration / 60);
    const content = `【冥想报告】专注度${report.focusScore}% ，时长${minutes}分钟`;
    return this.postInfoEntity.save({
      type: 1,
      userId,
      teamId: null,
      content,
      images: [],
      status: 1,
    });
  }

  /**
   * 手动发布
   */
  async manual(userId: number, content: string, images: string[]) {
    const user = await this.userInfoEntity.findOneBy({ id: userId });
    if (!user || user.role < 2) {
      throw new CoolCommException('无权限发布');
    }
    return this.postInfoEntity.save({
      type: 2,
      userId,
      teamId: null,
      content,
      images: images || [],
      status: 1,
    });
  }

  /**
   * 编辑手动动态
   */
  async updateManual(userId: number, id: number, content: string, images: string[]) {
    const post = await this.postInfoEntity.findOneBy({ id });
    if (!post) {
      throw new CoolCommException('动态不存在');
    }
    if (post.userId !== userId || post.type !== 2) {
      throw new CoolCommException('无权限编辑');
    }
    await this.postInfoEntity.update(id, { content, images });
  }

  /**
   * 点赞
   */
  async like(userId: number, postId: number) {
    const exists = await this.postLikeEntity.findOneBy({ userId, postId });
    if (exists) {
      return;
    }
    await this.postLikeEntity.insert({ userId, postId });

    // 触发点赞事件
    this.coolEventManager.emit('postLiked', userId);
  }
}
