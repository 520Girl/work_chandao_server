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
}
