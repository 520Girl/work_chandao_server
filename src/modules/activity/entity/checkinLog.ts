import { BaseEntity } from '../../base/entity/base';
import { Column, Entity, Index } from 'typeorm';

@Entity('activity_checkin_log')
export class ActivityCheckinLogEntity extends BaseEntity {
  @Index()
  @Column({ comment: '用户ID' })
  userId: number;

  @Index()
  @Column({ comment: '活动ID' })
  activityId: number;

  @Column({ comment: '签到时间', nullable: true })
  checkinTime: Date;

  @Column({ comment: '纬度', type: 'decimal', precision: 10, scale: 6, nullable: true })
  lat: string;

  @Column({ comment: '经度', type: 'decimal', precision: 10, scale: 6, nullable: true })
  lng: string;

  @Column({ comment: '定位精度(米)', nullable: true })
  accuracy: number;

  @Column({ comment: '距离(米)', nullable: true })
  distanceM: number;

  @Column({ comment: '签到结果 0失败 1成功', default: 1 })
  result: number;

  @Column({ comment: '来源 1手动 2自动', default: 1 })
  source: number;

  @Column({ comment: '失败原因', nullable: true })
  reason: string;

  @Column({ comment: 'IP', nullable: true })
  ip: string;

  @Column({ comment: 'User-Agent', type: 'text', nullable: true })
  ua: string;

  @Column({ comment: '省份(展示用)', nullable: true })
  province: string;

  @Column({ comment: '城市(展示用)', nullable: true })
  city: string;
}
