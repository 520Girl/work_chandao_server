import { Inject, Provide } from '@midwayjs/core';
import { BaseService, CoolCommException } from '@cool-midway/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import { TeamMemberEntity } from '../entity/member';
import { TeamInfoEntity } from '../entity/info';
import { UserInfoEntity } from '../../user/entity/info';
import { TeamInfoService } from './info';
import { MessageInfoService } from '../../message/service/info';

/**
 * 团队成员服务
 */
@Provide()
export class TeamMemberService extends BaseService {
  @InjectEntityModel(TeamMemberEntity)
  teamMemberEntity: Repository<TeamMemberEntity>;

  @InjectEntityModel(TeamInfoEntity)
  teamInfoEntity: Repository<TeamInfoEntity>;

  @InjectEntityModel(UserInfoEntity)
  userInfoEntity: Repository<UserInfoEntity>;

  @Inject()
  teamInfoService: TeamInfoService;

  @Inject()
  messageInfoService: MessageInfoService;

  /**
   * 加入团队 (Transactional)
   * @param userId
   * @param teamId
   */
  async join(userId: number, teamId: number) {
    await this.teamMemberEntity.manager.transaction(async manager => {
      const team = await manager.findOneBy(TeamInfoEntity, { id: teamId });
      if (!team) {
        throw new CoolCommException('团队已解散或ID错误');
      }

      const member = await manager.findOneBy(TeamMemberEntity, { userId, teamId });
      if (member) {
        if (member.exitType === 0) {
          throw new CoolCommException('您已是该团队成员，无需重复加入');
        }
        if (Number(team.maxMemberCount) > 0 && Number(team.memberCount) >= Number(team.maxMemberCount)) {
          throw new CoolCommException(
            `团队成员已达上限（${team.maxMemberCount}人），暂无法加入`
          );
        }
        // 重新加入
        await manager.update(TeamMemberEntity, member.id, {
          exitType: 0,
          joinedAt: new Date(),
          leftAt: null,
          operatorId: null,
        });
      } else {
        if (Number(team.maxMemberCount) > 0 && Number(team.memberCount) >= Number(team.maxMemberCount)) {
          throw new CoolCommException(
            `团队成员已达上限（${team.maxMemberCount}人），暂无法加入`
          );
        }
        await manager.save(TeamMemberEntity, {
          userId,
          teamId,
          joinedAt: new Date(),
          exitType: 0,
        });
      }

      // 更新团队人数
      await manager.increment(TeamInfoEntity, { id: teamId }, 'memberCount', 1);

      // 检查并更新用户首个团队
      const user = await manager.findOneBy(UserInfoEntity, { id: userId });
      if (user && !user.firstTeamId) {
        await manager.update(UserInfoEntity, userId, { firstTeamId: teamId });
      }
    });
    await this.teamInfoService.syncTypeAndEmit(teamId);
  }

  /**
   * 移除成员 (管理员操作 - Transactional)
   * @param operatorId 管理员ID
   * @param userId 成员ID
   * @param teamId
   */
  async remove(operatorId: number, userId: number, teamId: number) {
    await this.teamMemberEntity.manager.transaction(async manager => {
      const member = await manager.findOneBy(TeamMemberEntity, { userId, teamId });
      if (!member || member.exitType !== 0) {
        throw new CoolCommException('成员不存在或已退出');
      }

      await manager.update(TeamMemberEntity, member.id, {
        exitType: 2, // 管理员移除
        leftAt: new Date(),
        operatorId,
      });

      // 减少团队人数
      await manager.decrement(TeamInfoEntity, { id: teamId }, 'memberCount', 1);
    });
    await this.teamInfoService.syncTypeAndEmit(teamId);

    const team = await this.teamInfoEntity.findOneBy({ id: teamId });
    const user = await this.userInfoEntity.findOneBy({ id: userId });
    await this.messageInfoService.sendSystemToUsers({
      templateKey: 'TEAM_MEMBER_LEFT',
      targetType: 3,
      teamId,
      bizType: 'team_member_removed',
      bizId: teamId,
      templateParams: {
        teamName: team?.name ?? '',
        userId,
        userName: user?.nickName ?? '',
        exitType: 2,
        operatorId,
      },
    });
  }

  /**
   * 主动退出 (Transactional)
   * @param userId
   * @param teamId
   */
  async quit(userId: number, teamId: number) {
    await this.teamMemberEntity.manager.transaction(async manager => {
      const member = await manager.findOneBy(TeamMemberEntity, { userId, teamId });
      if (!member || member.exitType !== 0) {
        throw new CoolCommException('您不在此团队中');
      }

      await manager.update(TeamMemberEntity, member.id, {
        exitType: 1, // 主动退出
        leftAt: new Date(),
      });

      // 减少团队人数
      await manager.decrement(TeamInfoEntity, { id: teamId }, 'memberCount', 1);
    });
    await this.teamInfoService.syncTypeAndEmit(teamId);

    const team = await this.teamInfoEntity.findOneBy({ id: teamId });
    const user = await this.userInfoEntity.findOneBy({ id: userId });
    await this.messageInfoService.sendSystemToUsers({
      templateKey: 'TEAM_MEMBER_LEFT',
      targetType: 3,
      teamId,
      bizType: 'team_member_quit',
      bizId: teamId,
      templateParams: {
        teamName: team?.name ?? '',
        userId,
        userName: user?.nickName ?? '',
        exitType: 1,
      },
    });
  }

  /**
   * 获取我的团队列表
   * @param userId
   * @param status 0: 当前团队, 1: 历史团队（已退出）
   */
  async myTeams(userId: number, status: number = 0) {
    const qb = this.teamMemberEntity
      .createQueryBuilder('a')
      .innerJoin(TeamInfoEntity, 'b', 'a.teamId = b.id')
      .select('a.id', 'id')
      .addSelect('a.teamId', 'teamId')
      .addSelect('a.userId', 'userId')
      .addSelect('a.joinedAt', 'joinedAt')
      .addSelect('a.leftAt', 'leftAt')
      .addSelect('a.exitType', 'exitType')
      .addSelect('a.operatorId', 'operatorId')
      .addSelect('b.name', 'teamName')
      .addSelect('b.ownerId', 'ownerId')
      .addSelect('b.memberCount', 'memberCount')
      .where('a.userId = :userId', { userId });

    if (status === 0) {
      qb.andWhere('a.exitType = 0');
    } else {
      qb.andWhere('a.exitType != 0');
    }
    qb.orderBy('a.joinedAt', 'DESC');

    return await qb.getRawMany();
  }

  /**
   * App 团队成员分页
   */
  async appMemberPage(
    requesterId: number,
    params: {
      teamId?: number;
      role?: number;
      page?: number;
      size?: number;
    }
  ) {
    const page = Math.max(Number(params?.page ?? 1), 1);
    const size = Math.min(Math.max(Number(params?.size ?? 20), 1), 100);
    let teamId = params?.teamId != null ? Number(params.teamId) : null;
    if (!teamId) {
      const me = await this.userInfoEntity.findOneBy({ id: requesterId });
      teamId = me?.firstTeamId ? Number(me.firstTeamId) : null;
    }
    if (!teamId) throw new CoolCommException('缺少 teamId');

    const inTeam = await this.teamMemberEntity.findOneBy({
      userId: requesterId,
      teamId,
      exitType: 0,
    } as any);
    if (!inTeam) throw new CoolCommException('您不在该团队中');

    const role = Number(params?.role ?? 0);
    const offset = (page - 1) * size;

    const countSql = `
      SELECT COUNT(1) AS total
      FROM team_member m
      INNER JOIN team_info t ON t.id = m.teamId
      INNER JOIN user_info u ON u.id = m.userId
      WHERE m.teamId = ?
        AND m.exitType = 0
        AND u.status = 1
        ${role === 1 ? 'AND m.userId = t.ownerId' : ''}
        ${role === 2 ? 'AND m.userId <> t.ownerId' : ''}
    `;
    const totalRow: any[] = await this.teamMemberEntity.manager.query(countSql, [
      teamId,
    ]);
    const total = Number(totalRow?.[0]?.total ?? 0);

    const listSql = `
      SELECT
        m.userId AS userId,
        u.nickName AS nickName,
        u.avatarUrl AS avatarUrl,
        m.joinedAt AS joinedAt,
        t.ownerId AS ownerId,
        CASE WHEN m.userId = t.ownerId THEN 1 ELSE 0 END AS isOwner,
        IFNULL(pc.postCount, 0) AS postCount
      FROM team_member m
      INNER JOIN team_info t ON t.id = m.teamId
      INNER JOIN user_info u ON u.id = m.userId
      LEFT JOIN (
        SELECT p.userId AS userId, COUNT(1) AS postCount
        FROM post_info p
        WHERE p.teamId = ? AND p.status = 2
        GROUP BY p.userId
      ) pc ON pc.userId = m.userId
      WHERE m.teamId = ?
        AND m.exitType = 0
        AND u.status = 1
        ${role === 1 ? 'AND m.userId = t.ownerId' : ''}
        ${role === 2 ? 'AND m.userId <> t.ownerId' : ''}
      ORDER BY isOwner DESC, m.joinedAt DESC, m.userId DESC
      LIMIT ? OFFSET ?
    `;
    const list = await this.teamMemberEntity.manager.query(listSql, [
      teamId,
      teamId,
      size,
      offset,
    ]);

    return { list, pagination: { page, size, total }, teamId };
  }

  /**
   * App 负责人移除成员
   */
  async removeByOwner(ownerId: number, teamId: number, userId: number) {
    await this.teamMemberEntity.manager.transaction(async manager => {
      const team = await manager.findOneBy(TeamInfoEntity, { id: teamId });
      if (!team) throw new CoolCommException('团队已解散或ID错误');
      if (Number(team.ownerId) !== Number(ownerId)) {
        throw new CoolCommException('无权限操作');
      }
      if (Number(userId) === Number(team.ownerId)) {
        throw new CoolCommException('不能移除负责人');
      }

      const member = await manager.findOneBy(TeamMemberEntity, { userId, teamId });
      if (!member || member.exitType !== 0) {
        throw new CoolCommException('成员不存在或已退出');
      }

      await manager.update(TeamMemberEntity, member.id, {
        exitType: 2,
        leftAt: new Date(),
        operatorId: ownerId,
      });
      await manager.decrement(TeamInfoEntity, { id: teamId }, 'memberCount', 1);
    });

    await this.teamInfoService.syncTypeAndEmit(teamId);

    const team = await this.teamInfoEntity.findOneBy({ id: teamId });
    const user = await this.userInfoEntity.findOneBy({ id: userId });
    await this.messageInfoService.sendSystemToUsers({
      templateKey: 'TEAM_MEMBER_LEFT',
      targetType: 3,
      teamId,
      bizType: 'team_member_removed',
      bizId: teamId,
      templateParams: {
        teamName: team?.name ?? '',
        userId,
        userName: user?.nickName ?? '',
        exitType: 2,
        operatorId: ownerId,
      },
    });
  }
}
