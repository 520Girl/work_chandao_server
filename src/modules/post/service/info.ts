import { Config, Provide } from '@midwayjs/core';
import { BaseService, CoolCommException, CoolEventManager } from '@cool-midway/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import { PostInfoEntity } from '../entity/info';
import { PostLikeEntity } from '../entity/like';
import { MeditationReportEntity } from '../../meditation/entity/report';
import { MeditationSessionEntity } from '../../meditation/entity/session';
import { UserInfoEntity } from '../../user/entity/info';
import { TeamMemberEntity } from '../../team/entity/member';
import { Inject } from '@midwayjs/core';
import { join } from 'path';
import { pUploadPath } from '../../../comm/path';
import { PluginService } from '../../plugin/service/info';

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

  @Config('module.plugin.hooks')
  hooksConfig;

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
   * 生成带有报告信息的分享图片
   */
  private async generateReportImage(
    report: MeditationReportEntity,
    content: string
  ): Promise<string> {
    try {
      // 动态引入，避免在未安装依赖时直接报错
      const canvasLib: any = await require('canvas');
      const { createCanvas, loadImage } = canvasLib;

      const width = 800;
      const height = 600;
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext('2d');

      // 背景图路径（后端 public 目录）
      const bgPath = join(process.cwd(), 'public', 'post', 'report-bg.png');
      console.log('bgPath', bgPath);
      try {
        const bg = await loadImage(bgPath);
        ctx.drawImage(bg, 0, 0, width, height);
      } catch {
        // 背景缺失时使用纯色背景
        ctx.fillStyle = '#101827';
        ctx.fillRect(0, 0, width, height);
      }

      // 文本样式
      ctx.fillStyle = '#ffffff';
      ctx.font = '24px sans-serif';
      ctx.textBaseline = 'top';

      const lines: string[] = [];
      const minutes = Math.floor(report.totalDuration / 60);
      lines.push(`冥想时长：${minutes} 分钟`);
      lines.push(`专注度：${report.focusScore}%`);
      lines.push('');
      lines.push('心得：');

      const maxWidth = width - 120;
      const words = content.split('');
      let line = '';
      for (const ch of words) {
        const testLine = line + ch;
        const m = ctx.measureText(testLine);
        if (m.width > maxWidth) {
          lines.push(line);
          line = ch;
        } else {
          line = testLine;
        }
      }
      if (line) {
        lines.push(line);
      }

      let y = 120;
      for (const l of lines) {
        ctx.fillText(l, 60, y);
        y += 32;
      }

      const buffer = canvas.toBuffer('image/png');
      const fileName = `report-${report.id}-${Date.now()}.png`;
      const fs = await import('fs/promises');
      const dir = join(pUploadPath(), 'post');
      await fs.mkdir(dir, { recursive: true });
      const filePath = join(dir, fileName);
      await fs.writeFile(filePath, buffer);

      // 与上传文件保持一致：domain + /upload/{YYYYMMDD}/post/{fileName}
      const key = join('post', fileName).replace(/\\/g, '/');
      const url = await this.pluginService.invoke(
        'upload',
        'uploadWithKey',
        filePath,
        key
      );
      // 修复 Windows 下 URL 可能包含反斜杠的问题
      return url.replace(/\\/g, '/');
    } catch (error) {
      // 出现异常时使用默认背景图
      return '/post/report-bg.png';
    }
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
    const imageUrl = await this.generateReportImage(report, finalContent);
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
   * @param teamId 可选，指定团队；未传入时默认需管理员审核
   */
  async manual(userId: number, content: string, images: string[], teamId?: number | null) {
    const userTeamId = await this.getUserTeamId(userId);
    if (!userTeamId) {
      throw new CoolCommException('您还未加入任何社群，请先加入社群');
    }

    // 最终团队：传入则用传入值，否则用首团队
    const finalTeamId = teamId ?? userTeamId;

    // 若指定了团队，则必须是该团队成员
    const inTeam = await this.isUserInTeam(userId, finalTeamId);
    if (!inTeam) {
      throw new CoolCommException('您不是目标社群的成员，无法提交');
    }

    // 未传入 teamId 时默认需要管理员审核
    const status = teamId != null ? 2 : 1;

    return this.postInfoEntity.save({
      type: 2,
      userId,
      teamId: finalTeamId,
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
   * App 动态流：当前用户自己的动态（仅 status=2），按时间倒序
   */
  async feed(userId: number, page: number = 1, size: number = 20) {
    const qb = this.postInfoEntity
      .createQueryBuilder('a')
      .where('a.status = 2')
      .andWhere('a.userId = :userId', { userId })
      .orderBy('a.createTime', 'DESC');
    const total = await qb.getCount();
    const list = await qb
      .skip((page - 1) * size)
      .take(size)
      .getMany();
    return { list, pagination: { page, size, total } };
  }

  /**
   * 用户所在团队的动态流：仅 status=2，按时间倒序，按用户所属团队筛选
   */
  async feedTeams(userId: number, page: number = 1, size: number = 20) {
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
