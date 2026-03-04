import { BaseEntity } from '../../base/entity/base';
import { Column, Entity, Index } from 'typeorm';

/**
 * 冥想报告
 */
@Entity('meditation_report')
export class MeditationReportEntity extends BaseEntity {
  @Index()
  @Column({ comment: '会话ID' })
  sessionId: number;

  @Column({ comment: '总时长', default: 0 })
  totalDuration: number;

  @Column({ comment: '专注度评分', default: 0 })
  focusScore: number;

  @Column({ comment: '获得成就', type: 'json', nullable: true })
  achievements: string[];
}
