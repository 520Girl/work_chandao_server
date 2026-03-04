
import { BaseEntity } from '../../base/entity/base';
import { Column, Entity, Index } from 'typeorm';

/**
 * 用户勋章
 */
@Entity('user_medal')
export class UserMedalEntity extends BaseEntity {
  @Index()
  @Column({ comment: '用户ID' })
  userId: number;

  @Index()
  @Column({ comment: '勋章ID' })
  medalId: number;

  @Column({ comment: '获得时间' })
  obtainedAt: Date;

  @Column({ comment: '获得时的等级', default: 1 })
  level: number;
}
