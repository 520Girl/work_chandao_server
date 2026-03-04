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

  @Column({ comment: '打卡记录', type: 'json', nullable: true })
  checkins: any[];
}
