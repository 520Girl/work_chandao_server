
import { BaseEntity } from '../../base/entity/base';
import { Column, Entity, Index } from 'typeorm';

/**
 * 勋章模板
 */
@Entity('medal_template')
export class MedalTemplateEntity extends BaseEntity {
  @Index()
  @Column({ comment: '勋章名称' })
  name: string;

  @Column({ comment: '图标URL', nullable: true })
  icon: string;

  @Column({ comment: '类型: meditation, activity, community, growth' })
  type: string;

  @Column({ comment: '描述', nullable: true })
  description: string;

  @Column({ comment: '触发条件JSON', type: 'json' })
  condition: any;

  @Column({ comment: '等级 1-基础 2-进阶 3-高级', default: 1 })
  level: number;

  @Column({ comment: '是否启用', default: 1 })
  isActive: number;
}
