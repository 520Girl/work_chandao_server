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
import { ActivityInfoEntity } from '../../activity/entity/info';

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

  @InjectEntityModel(ActivityInfoEntity)
  activityInfoEntity: Repository<ActivityInfoEntity>;

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

  private async getUserActiveTeamIds(userId: number): Promise<number[]> {
    const memberships = await this.teamMemberEntity.findBy({ userId, exitType: 0 } as any);
    let teamIds = memberships.map((m) => m.teamId);
    const user = await this.userInfoEntity.findOneBy({ id: userId });
    if (user?.firstTeamId && !teamIds.includes(user.firstTeamId)) {
      teamIds = [...teamIds, user.firstTeamId];
    }
    return [...new Set(teamIds.filter((id) => Number(id) > 0))];
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
    content?: string,
    userState?: number
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
      userState: Number(userState) > 0 ? Number(userState) : 1,
      status,
    });
  }

  /**
   * 手动发布（所有成员可发布）
   * @param teamId 可选，指定团队；未传入时默认需管理员审核
   */
  async manual(
    userId: number,
    content: string,
    images: string[],
    teamId?: number | null,
    userState?: number
  ) {
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
      userState: Number(userState) > 0 ? Number(userState) : 1,
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
   * App 动态详情（含作者信息、点赞数、当前用户是否已点赞）
   */
  async appInfo(userId: number, id: number) {
    const rows: any[] = await this.postInfoEntity.manager.query(
      `
      SELECT
        p.*,
        u.nickName AS nickName,
        u.avatarUrl AS avatarUrl,
        (SELECT COUNT(1) FROM post_like pl WHERE pl.postId = p.id) AS likeCount,
        IF(
          EXISTS(
            SELECT 1
            FROM post_like plu
            WHERE plu.postId = p.id
              AND plu.userId = ?
          ),
          1,
          0
        ) AS isLiked
      FROM post_info p
      LEFT JOIN user_info u ON u.id = p.userId
      WHERE p.id = ?
        AND p.status = 2
      LIMIT 1
      `,
      [Number(userId), Number(id)]
    );
    const row = rows?.[0];
    if (!row) {
      throw new CoolCommException('动态不存在');
    }
    if (row.teamId) {
      const inTeam = await this.teamMemberEntity.findOneBy({
        userId,
        teamId: Number(row.teamId),
        exitType: 0,
      } as any);
      if (!inTeam && Number(row.userId) !== Number(userId)) {
        throw new CoolCommException('仅社群成员可查看');
      }
    }

    if (row && typeof row.images === 'string') {
      try {
        row.images = JSON.parse(row.images);
      } catch {}
    }
    if (!Array.isArray(row.images)) row.images = row.images ? [row.images] : [];

    row.likeCount = Number(row.likeCount ?? 0);
    row.isLiked = Number(row.isLiked ?? 0) === 1;
    return row;
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

  async mixedFeed(userId: number, page: number = 1, size: number = 20) {
    const teamIds = await this.getUserActiveTeamIds(userId);
    const offset = (page - 1) * size;

    const baseParams: any[] = [];

    const postWhere =
      teamIds.length > 0 ? `p.teamId IN (${teamIds.map(() => '?').join(',')})` : '1=0';
    baseParams.push(userId);
    if (teamIds.length > 0) baseParams.push(...teamIds);

    const activityWhere =
      teamIds.length > 0
        ? `(a.teamId IS NULL OR a.teamId IN (${teamIds.map(() => '?').join(',')}))`
        : 'a.teamId IS NULL';
    baseParams.push(userId);
    if (teamIds.length > 0) baseParams.push(...teamIds);

    const unionSql = `
      SELECT *
      FROM (
        SELECT
          'post' AS itemType,
          p.id AS id,
          p.updateTime AS sortTime,
          0 AS isTop,
          p.teamId AS teamId,
          p.userId AS userId,
          u.nickName AS nickName,
          u.avatarUrl AS avatarUrl,
          p.type AS postType,
          p.userState AS userState,
          p.content AS content,
          p.images AS images,
          IFNULL(pl.likeCount, 0) AS likeCount,
          IF(
            EXISTS(
              SELECT 1
              FROM post_like plu
              WHERE plu.postId = p.id
                AND plu.userId = ?
            ),
            1,
            0
          ) AS isLiked,
          NULL AS participantCount,
          NULL AS participantUsers,
          NULL AS isJoined,
          NULL AS activityTitle,
          NULL AS activityStartDate,
          NULL AS activityEndDate,
          NULL AS activityTemplateName,
          NULL AS activityTemplateIcon
        FROM post_info p
        LEFT JOIN user_info u ON p.userId = u.id
        LEFT JOIN (
          SELECT postId, COUNT(1) AS likeCount
          FROM post_like
          GROUP BY postId
        ) pl ON pl.postId = p.id
        WHERE p.status = 2 AND ${postWhere}
        UNION ALL
        SELECT
          'activity' AS itemType,
          a.id AS id,
          COALESCE(a.startDate, a.createTime) AS sortTime,
          a.isTop AS isTop,
          a.teamId AS teamId,
          a.authorId AS userId,
          NULL AS nickName,
          NULL AS avatarUrl,
          NULL AS postType,
          NULL AS userState,
          a.content AS content,
          NULL AS images,
          NULL AS likeCount,
          NULL AS isLiked,
          IFNULL(pa.participantCount, 0) AS participantCount,
          IFNULL(pa.participantNames, '') AS participantUsers,
          IF(
            EXISTS(
              SELECT 1
              FROM activity_participation apu
              WHERE apu.activityId = a.id
                AND apu.userId = ?
                AND apu.status <> 3
            ),
            1,
            0
          ) AS isJoined,
          a.title AS activityTitle,
          a.startDate AS activityStartDate,
          a.endDate AS activityEndDate,
          t.name AS activityTemplateName,
          t.icon AS activityTemplateIcon
        FROM activity_info a
        LEFT JOIN activity_template t ON a.templateId = t.id
        LEFT JOIN (
          SELECT
            ap.activityId AS activityId,
            COUNT(1) AS participantCount,
            SUBSTRING_INDEX(
              GROUP_CONCAT(IFNULL(u.nickName, '') ORDER BY ap.applyTime DESC, ap.id DESC SEPARATOR ','),
              ',',
              5
            ) AS participantNames
          FROM activity_participation ap
          LEFT JOIN user_info u ON ap.userId = u.id
          WHERE ap.status <> 3
          GROUP BY ap.activityId
        ) pa ON pa.activityId = a.id
        WHERE a.status = 2
          AND (a.endDate IS NULL OR a.endDate >= NOW())
          AND ${activityWhere}
      ) x
    `;

    const countSql = `SELECT COUNT(1) as total FROM (${unionSql}) c`;
    const countRes: any[] = await this.postInfoEntity.manager.query(countSql, baseParams);
    const total = Number(countRes?.[0]?.total ?? 0);

    const listSql = `${unionSql} ORDER BY isTop DESC, sortTime DESC, id DESC LIMIT ? OFFSET ?`;
    const listParams = [...baseParams, Number(size), Number(offset)];
    const list = await this.postInfoEntity.manager.query(listSql, listParams);

    for (const row of list) {
      if (row && typeof row.images === 'string') {
        try {
          row.images = JSON.parse(row.images);
        } catch {}
      }
      if (row?.itemType === 'activity') {
        row.participantCount = Number(row.participantCount ?? 0);
        if (typeof row.participantUsers === 'string') {
          const s = row.participantUsers.trim();
          row.participantUsers = s ? s.split(',').filter(Boolean).slice(0, 5) : [];
        } else if (!Array.isArray(row.participantUsers)) {
          row.participantUsers = [];
        }
        row.isJoined = Number(row.isJoined ?? 0) === 1;
      } else if (row?.itemType === 'post') {
        row.isLiked = Number(row.isLiked ?? 0) === 1;
      }
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
