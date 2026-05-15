import { BaseEntity } from '../../base/entity/base';
import { Column, Entity, Index } from 'typeorm';

/**
 * 活动报名
 */
@Entity('activity_participation')
export class ActivityParticipationEntity extends BaseEntity {
  @Index()
  @Column({ comment: '用户ID' })
  userId: number;

  @Index()
  @Column({ comment: '活动ID' })
  activityId: number;

  @Column({ comment: '报名时间', nullable: true })
  applyTime: Date;

  @Column({ comment: '状态', dict: ['待审核', '已通过', '已拒绝'], default: 1 })
  status: number;

  @Column({ comment: '打卡记录', type: 'json', nullable: true })
  checkins: any[];

  /** 共修：0 未就绪 1 已就绪 */
  @Column({ comment: '共修就绪状态', dict: ['未就绪', '已就绪'], default: 0 })
  readyStatus: number;

  @Column({ comment: '报名时间', nullable: true })
  joinTime: Date;

  @Column({ comment: '退出时间', nullable: true })
  leaveTime: Date;

  /** 1 成员 2 主持 */
  @Column({ comment: '共修房间角色', dict: ['成员', '主持'], default: 1 })
  roomRole: number;
}
