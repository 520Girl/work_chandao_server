import { Provide } from '@midwayjs/core';
import { BaseService, CoolCommException, CoolEventManager } from '@cool-midway/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import { PostInfoEntity } from '../entity/info';
import { PostLikeEntity } from '../entity/like';
import { MeditationReportEntity } from '../../meditation/entity/report';
import { MeditationSessionEntity } from '../../meditation/entity/session';
import { UserInfoEntity } from '../../user/entity/info';
import { TeamMemberEntity } from '../../team/entity/member';
import { PluginService } from '../../plugin/service/info';
import { Inject } from '@midwayjs/core';
import { join } from 'path';
import * as os from 'os';
import * as fs from 'fs';

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

  @InjectEntityModel(TeamMemberEntity)
  teamMemberEntity: Repository<TeamMemberEntity>;

  @Inject()
  coolEventManager: CoolEventManager;

  @Inject()
  pluginService: PluginService;

  /**
   * 获取用户首团队ID（firstTeamId 或任意加入的团队）
   */
  private async getUserTeamId(userId: number): Promise<number | null> {
    const user = await this.userInfoEntity.findOneBy({ id: userId });
    if (user?.firstTeamId) {
      return user.firstTeamId;
    }
    const member = await this.teamMemberEntity.findOneBy({ userId });
    return member ? member.teamId : null;
  }

  /**
   * 校验用户是否属于某团队
   */
  private async isUserInTeam(userId: number, teamId: number): Promise<boolean> {
    const m = await this.teamMemberEntity.findOneBy({ userId, teamId });
    return !!m;
  }

  /**
   * 生成带有报告信息的分享图片，保存到上传目录并返回与上传接口一致的链接
   */
  private async generateReportImage(
    report: MeditationReportEntity,
    content: string
  ): Promise<string> {
    return ''; // 临时绕过 canvas 报错
  }

  /**
   * 分享冥想报告
   * @param targetTeamId 可选，提交到其他社群时传入，需审核
   */
  async share(
    userId: number,
    reportId: number,
    targetTeamId?: number | null,
    content?: string
  ) {
    const userTeamId = await this.getUserTeamId(userId);
    if (!userTeamId) {
      throw new CoolCommException('您还未加入任何社群，请先加入社群');
    }
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
    const defaultContent = `【冥想报告】专注度${report.focusScore}% ，时长${minutes}分钟`;
    const finalContent = content && content.trim() ? content : defaultContent;
    const teamId = targetTeamId ?? userTeamId;
    const isOtherCommunity = targetTeamId != null && targetTeamId !== userTeamId;
    const status = isOtherCommunity ? 1 : 2; // 其他社群待审核，本团队直接发布
    if (isOtherCommunity) {
      const inTeam = await this.isUserInTeam(userId, targetTeamId);
      if (!inTeam) {
        throw new CoolCommException('您不是目标社群的成员，无法提交');
      }
    }
    console.log('finalContent', finalContent);
    const imageUrl = await this.generateReportImage(report, finalContent);
    console.log('imageUrl', imageUrl);
    return this.postInfoEntity.save({
      type: 1,
      userId,
      teamId,
      content: finalContent,
      images: imageUrl ? [imageUrl] : [],
      status,
    });
  }

  /**
   * 手动发布（所有成员可发布）
   * @param targetTeamId 可选，提交到其他社群时传入，需审核
   */
  async manual(userId: number, content: string, images: string[], targetTeamId?: number | null) {
    const userTeamId = await this.getUserTeamId(userId);
    if (!userTeamId) {
      throw new CoolCommException('您还未加入任何社群，请先加入社群');
    }
    const teamId = targetTeamId ?? userTeamId;
    const isOtherCommunity = targetTeamId != null && targetTeamId !== userTeamId;
    const status = isOtherCommunity ? 1 : 2;
    if (isOtherCommunity) {
      const inTeam = await this.isUserInTeam(userId, targetTeamId);
      if (!inTeam) {
        throw new CoolCommException('您不是目标社群的成员，无法提交');
      }
    }
    return this.postInfoEntity.save({
      type: 2,
      userId,
      teamId,
      content,
      images: images || [],
      status,
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
   * 点赞（仅对 status=2 的动态生效）
   */
  async like(userId: number, postId: number) {
    const post = await this.postInfoEntity.findOneBy({ id: postId });
    if (!post) {
      throw new CoolCommException('动态不存在');
    }
    if (post.status !== 2) {
      throw new CoolCommException('该动态暂不支持点赞');
    }

    // 仅团队成员可点赞团队动态
    if (post.teamId) {
      const inTeam = await this.isUserInTeam(userId, post.teamId);
      if (!inTeam) {
        throw new CoolCommException('您不是该社群成员，无法点赞');
      }
    }

    const exists = await this.postLikeEntity.findOneBy({ userId, postId });
    if (exists) {
      throw new CoolCommException('您已经点过赞啦');
    }
    await this.postLikeEntity.insert({ userId, postId });
    this.coolEventManager.emit('postLiked', post.userId);
  }

  /**
   * App 动态流：仅 status=2，按时间倒序，按用户所属团队筛选
   */
  async feed(userId: number, page: number = 1, size: number = 20) {
    const memberships = await this.teamMemberEntity.findBy({ userId });
    let teamIds = memberships.map((m) => m.teamId);
    const user = await this.userInfoEntity.findOneBy({ id: userId });
    if (user?.firstTeamId && !teamIds.includes(user.firstTeamId)) {
      teamIds = [...teamIds, user.firstTeamId];
    }
    if (teamIds.length === 0) {
      return { list: [], pagination: { page, size, total: 0 } };
    }
    const qb = this.postInfoEntity
      .createQueryBuilder('a')
      .where('a.status = 2')
      .andWhere('a.teamId IN (:...teamIds)', { teamIds })
      .orderBy('a.createTime', 'DESC');
    const total = await qb.getCount();
    const list = await qb
      .skip((page - 1) * size)
      .take(size)
      .getMany();
    if (list.length > 0) {
      const userIds = [...new Set(list.map((p) => p.userId))];
      const users = await this.userInfoEntity
        .createQueryBuilder('u')
        .where('u.id IN (:...userIds)', { userIds })
        .select(['u.id', 'u.nickName', 'u.avatarUrl'])
        .getMany();
      const userMap = new Map(users.map((u) => [u.id, u]));
      (list as any[]).forEach((p) => {
        const u = userMap.get(p.userId);
        (p as any).nickName = u?.nickName;
        (p as any).avatarUrl = u?.avatarUrl;
      });
    }
    return { list, pagination: { page, size, total } };
  }

  /**
   * 审核通过（需 post:audit 权限）
   */
  async approve(id: number) {
    const post = await this.postInfoEntity.findOneBy({ id });
    if (!post) {
      throw new CoolCommException('动态不存在');
    }
    await this.postInfoEntity.update(id, { status: 2 });
  }

  /**
   * 审核拒绝（需 post:audit 权限）
   */
  async reject(id: number) {
    const post = await this.postInfoEntity.findOneBy({ id });
    if (!post) {
      throw new CoolCommException('动态不存在');
    }
    await this.postInfoEntity.update(id, { status: 3 });
  }

  /**
   * 获取动态点赞列表（含用户信息）
   */
  async getLikeUsers(postId: number) {
    const likes = await this.postLikeEntity.find({
      where: { postId },
      order: { createTime: 'DESC' },
    });
    if (likes.length === 0) {
      return [];
    }
    const userIds = likes.map((l) => l.userId);
    const users = await this.userInfoEntity
      .createQueryBuilder('u')
      .where('u.id IN (:...userIds)', { userIds })
      .getMany();
    const userMap = new Map(users.map((u) => [u.id, u]));
    return likes.map((l) => {
      const u = userMap.get(l.userId);
      return { userId: l.userId, nickName: u?.nickName, avatarUrl: u?.avatarUrl, createTime: l.createTime };
    });
  }
}
