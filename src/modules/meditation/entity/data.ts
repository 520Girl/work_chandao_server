import { BaseEntity } from '../../base/entity/base';
import { Column, Entity, Index } from 'typeorm';

/**
 * 生理数据
 */
@Entity('meditation_data')
export class MeditationDataEntity extends BaseEntity {
  @Index()
  @Column({ comment: '会话ID', default: 0 })
  sessionId: number;

  @Column({ comment: '时间戳', nullable: true })
  recordTime: Date;

  @Column({ comment: '心率', default: 0 })
  heartRate: number;

  @Column({ comment: '呼吸率', default: 0 })
  breathRate: number;

  @Column({ comment: '在座状态', dict: ['离座', '在座'], default: 0 })
  inBed: number;

  @Column({ comment: '体动值', default: 0 })
  bodyMovement: number;

  @Column({ comment: '是否包含波形数据', dict: ['否', '是'], default: 0 })
  waveform: number;

  @Column({ comment: '呼吸波形数据', type: 'text', nullable: true })
  respiratoryWave: string;

  @Column({ comment: '心率波形数据', type: 'text', nullable: true })
  heartRateWave: string;
}
