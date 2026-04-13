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

  @Column({ comment: '累计冥想天数', default: 0 })
  totalDays: number;

  @Column({ comment: '累计冥想总时长(小时)', name: 'totalSeconds', type: 'double', default: 0 })
  totalHours: number;

  @Column({ comment: '连续冥想天数', default: 0 })
  consecutiveDays: number;

  @Column({ comment: '专注度评分', default: 0 })
  focusScore: number;

  @Column({ comment: '平均心率', type: 'double', default: 0 })
  avgHeartRate: number;

  @Column({ comment: '平均呼吸率', type: 'double', default: 0 })
  avgBreathRate: number;

  @Column({ comment: '体动次数', default: 0 })
  movementCount: number;

  @Column({ comment: 'HRV近似分数', type: 'double', default: 0 })
  hrvScore: number;

  @Column({ comment: 'HRV来源', length: 32, nullable: true })
  hrvSource: string;

  @Column({ comment: '平均温度', type: 'double', default: 0 })
  avgTemperature: number;

  @Column({ comment: '平均湿度', type: 'double', default: 0 })
  avgHumidity: number;

  @Column({ comment: '平静占比(浅蓝)', type: 'double', default: 0 })
  peaceRatio: number;

  @Column({ comment: '放松占比(深蓝)', type: 'double', default: 0 })
  relaxRatio: number;

  @Column({ comment: '紧张占比(浅红)', type: 'double', default: 0 })
  tensionRatio: number;

  @Column({ comment: '焦虑占比(深红)', type: 'double', default: 0 })
  anxietyRatio: number;

  @Column({ comment: '执着厌离分(1-100)', type: 'double', default: 50 })
  attachmentRatio: number;

  @Column({ comment: '分段指标(6段)', type: 'json', nullable: true })
  sections: any;

  @Column({ comment: '总坐次数', default: 0 })
  sitCount: number;

  @Column({ comment: '获得成就', type: 'json', nullable: true })
  achievements: string[];
}
