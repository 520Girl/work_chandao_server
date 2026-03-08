import { BaseEntity } from '../../base/entity/base';
import { Column, Entity, Index } from 'typeorm';

/**
 * 冥想会话
 */
@Entity('meditation_session')
export class MeditationSessionEntity extends BaseEntity {
  @Index()
  @Column({ comment: '用户ID' })
  userId: number;

  @Column({ comment: '设备SN', nullable: true })
  sn: string;

  @Column({ comment: '冥想类型', dict: ['未知', '设备冥想', '无设备冥想'], default: 1 })
  type: number;

  @Column({ comment: '开始时间', nullable: true })
  startDate: Date;

  @Column({ comment: '结束时间', nullable: true })
  endDate: Date;

  @Column({
    comment: '状态',
    dict: ['未知', '进行中', '已结束', '异常中断'],
    default: 1,
  })
  status: number;

  @Column({ comment: '设定时长' })
  targetDuration: number;

  @Column({ comment: '最后活动时间', nullable: true })
  lastActiveTime: Date;
}
