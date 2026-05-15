import { BaseEntity } from '../../base/entity/base';
import { Column, Entity, Index } from 'typeorm';

/**
 * 活动信息
 */
@Entity('activity_info')
export class ActivityInfoEntity extends BaseEntity {
  @Index()
  @Column({ comment: '模板ID' })
  templateId: number;

  @Index()
  @Column({ comment: '团队ID', nullable: true })
  teamId: number;

  @Column({ comment: '标题' })
  title: string;

  @Column({ comment: '开始时间', nullable: true })
  startDate: Date;

  @Column({ comment: '结束时间', nullable: true })
  endDate: Date;

  @Column({ comment: '详细内容', type: 'text', nullable: true })
  content: string;

  @Column({ comment: '禅修目标时长(秒)', default: 0 })
  targetMeditationSeconds: number;

  @Column({ comment: '达标百分比(0-100)', default: 100 })
  passPercent: number;

  @Column({ comment: '是否置顶', dict: ['否', '是'], default: 0 })
  isTop: number;

  @Column({ comment: '发布人ID' })
  authorId: number;

  @Column({ comment: '状态', dict: ['未知', '草稿', '发布'], default: 1 })
  status: number;

  @Column({ comment: '打卡模式', dict: ['未知', '每日打卡', '仅一次'], default: 1 })
  checkinMode: number;

  /** 1 普通打卡活动 2 多人共修 */
  @Column({ comment: '活动类型', dict: ['普通打卡', '多人共修'], default: 1 })
  activityType: number;

  /** 共修配置：maxParticipants、roomNo、scheduledStartTime、scheduledEndTime、startMode */
  @Column({ comment: '共修会话扩展配置', type: 'json', nullable: true })
  sessionConfig: Record<string, any>;

  /** 0 待开场 1 进行中 2 已结算 */
  @Column({ comment: '共修场次阶段', dict: ['待开场', '进行中', '已结算'], default: 0 })
  groupSessionPhase: number;

  /** 开场瞬间锁定的参赛用户 ID 列表 */
  @Column({ comment: '共修锁定名单', type: 'json', nullable: true })
  lockedRosterUserIds: number[];
}
