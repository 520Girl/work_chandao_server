import { BaseEntity } from '../../base/entity/base';
import { Column, Entity } from 'typeorm';

/**
 * 活动模板
 */
@Entity('activity_template')
export class ActivityTemplateEntity extends BaseEntity {
  @Column({ comment: '模板名称' })
  name: string;

  @Column({ comment: '描述内容', type: 'text', nullable: true })
  description: string;

  @Column({ comment: '图标', nullable: true })
  icon: string;

  @Column({
    comment: '团队负责人可小程序发布',
    dict: ['否', '是'],
    default: 1,
  })
  allowTeamPublish: number;

  @Column({ comment: '默认活动类型', dict: ['普通打卡', '多人共修'], default: 1 })
  activityTypeDefault: number;

  @Column({ comment: '默认打卡模式', dict: ['每日打卡', '仅一次'], default: 1 })
  checkinModeDefault: number;

  @Column({ comment: '默认禅修目标(秒)', default: 0 })
  targetMeditationSecondsDefault: number;

  @Column({ comment: '默认达标百分比(0-100)', default: 100 })
  passPercentDefault: number;

  /** 模板默认会话配置：roomNo/maxParticipants/startMode 等 */
  @Column({ comment: '默认会话配置', type: 'json', nullable: true })
  sessionConfigDefault: Record<string, any>;
}
