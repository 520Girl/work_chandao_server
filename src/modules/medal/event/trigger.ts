
import { Inject, Provide, Scope, ScopeEnum } from '@midwayjs/core';
import { CoolEvent, Event } from '@cool-midway/core';
import { MedalAwardService } from '../service/award';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import { MeditationSessionEntity } from '../../meditation/entity/session';
import { ActivityParticipationEntity } from '../../activity/entity/participation';
import { ActivityInfoEntity } from '../../activity/entity/info';
import { PostLikeEntity } from '../../post/entity/like';
import { PostInfoEntity } from '../../post/entity/info';
import { TeamInfoEntity } from '../../team/entity/info';
import * as _ from 'lodash';

/**
 * 勋章触发监听器
 */
@Provide()
@Scope(ScopeEnum.Singleton)
@CoolEvent()
export class MedalEventListener {
  @Inject()
  medalAwardService: MedalAwardService;

  @InjectEntityModel(MeditationSessionEntity)
  meditationSessionEntity: Repository<MeditationSessionEntity>;

  @InjectEntityModel(ActivityParticipationEntity)
  activityParticipationEntity: Repository<ActivityParticipationEntity>;

  @InjectEntityModel(ActivityInfoEntity)
  activityInfoEntity: Repository<ActivityInfoEntity>;

  @InjectEntityModel(PostLikeEntity)
  postLikeEntity: Repository<PostLikeEntity>;

  @InjectEntityModel(PostInfoEntity)
  postInfoEntity: Repository<PostInfoEntity>;

  @InjectEntityModel(TeamInfoEntity)
  teamInfoEntity: Repository<TeamInfoEntity>;

  /**
   * 监听冥想结束事件
   * 需在冥想模块结束时 emit('meditationEnded', session)
   */
  @Event('meditationEnded')
  async onMeditationEnded(session: MeditationSessionEntity) {
    const userId = session.userId;
    
    // 1. 计算总时长
    const totalDurationResult = await this.meditationSessionEntity
        .createQueryBuilder('session')
        .where('session.userId = :userId', { userId })
        .andWhere('session.status = 2') // 已完成
        .select('SUM(session.targetDuration)', 'sum')
        .getRawOne();
    
    const totalDuration = parseInt(totalDurationResult.sum || 0) / 60; // 分钟

    // 2. 计算连续天数
    // 获取用户所有已完成冥想的日期（去重）
    const sessions = await this.meditationSessionEntity
        .createQueryBuilder('session')
        .where('session.userId = :userId', { userId })
        .andWhere('session.status = 2')
        .select('DATE(session.startDate)', 'date')
        .distinct(true)
        .orderBy('DATE(session.startDate)', 'DESC')
        .getRawMany();

    let consecutiveDays = 0;
    if (sessions.length > 0) {
        consecutiveDays = 1;
        let currentDate = new Date(sessions[0].date);
        
        for (let i = 1; i < sessions.length; i++) {
            const prevDate = new Date(sessions[i].date);
            const diffTime = Math.abs(currentDate.getTime() - prevDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
            
            if (diffDays === 1) {
                consecutiveDays++;
                currentDate = prevDate;
            } else {
                break;
            }
        }
    }
    
    // 3. 计算专注度（假设 report 已经生成并可以查询到，或者这里简化处理）
    // 这里暂时用一个模拟值或查库逻辑，如果需要更精确，应该监听 report 生成事件
    // 假设MedalAwardService可以处理 focus_score 类型，这里先不传，因为 session 中没有 focusScore
        
    await this.medalAwardService.checkAndAward(userId, 'meditation', {
        totalDuration,
        consecutiveDays,
        // focusScore: ...
    });
  }

  /**
   * 监听活动参与
   */
  @Event('activityJoined')
  async onActivityJoined(userId: number) {
    // 1. 参与次数
    const joinCount = await this.activityParticipationEntity.countBy({ userId });
    
    await this.medalAwardService.checkAndAward(userId, 'activity', {
      joinCount
    });
  }

  /**
   * 监听活动创建 (需要 activity 模块 emit 'activityCreated')
   * 假设 activity service create 方法中 emit 了此事件
   */
  @Event('activityCreated')
  async onActivityCreated(userId: number) {
      const createCount = await this.activityInfoEntity.countBy({ authorId: userId });
      await this.medalAwardService.checkAndAward(userId, 'activity', {
          createCount
      });
  }

  /**
   * 监听点赞事件 (post service emit 'postLiked')
   */
  @Event('postLiked')
  async onPostLiked(userId: number) {
      // 需求：动态被点赞数（社群贡献）
      // 这需要查询该用户发布的所有帖子收到的点赞总数
      
      // 1. 查用户发的所有帖子ID
      const posts = await this.postInfoEntity.findBy({ userId });
      const postIds = posts.map(p => p.id);
      
      let likeCount = 0;
      if (postIds.length > 0) {
          likeCount = await this.postLikeEntity
            .createQueryBuilder('like')
            .where('like.postId IN (:...ids)', { ids: postIds })
            .getCount();
      }

      await this.medalAwardService.checkAndAward(userId, 'community', {
          likeCount
      });
  }

  /**
   * 监听团队成员变化 (team service emit 'teamMemberCountChanged')
   * 用于社群领袖勋章
   */
  @Event('teamMemberCountChanged')
  async onTeamMemberCountChanged(teamId: number, count: number) {
      const team = await this.teamInfoEntity.findOneBy({ id: teamId });
      if (team && team.ownerId) {
          await this.medalAwardService.checkAndAward(team.ownerId, 'community', {
              teamMemberCount: count
          });
      }
  }

  /**
   * 监听角色升级
   */
  @Event('userRoleUpgraded')
  async onUserRoleUpgraded(userId: number, roleLevel: number) {
      // roleLevel 对应 UserRole 枚举
      // 假设 UserRole.GROUP_LEADER = 2, CAMP_ADMIN = 3
      // 这里传递 roleLevel 给 service 判断
      
      // 转换 roleLevel 为勋章条件中的字符串标识
      let levelStr = '';
      if (roleLevel === 2) levelStr = 'group_leader';
      if (roleLevel === 3) levelStr = 'camp_admin';
      
      if (levelStr) {
          await this.medalAwardService.checkAndAward(userId, 'growth', {
              roleLevel: levelStr
          });
      }
  }
}
