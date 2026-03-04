import { BaseEntity } from '../../base/entity/base';
import { Column, Entity, Index } from 'typeorm';

/**
 * 动态点赞
 */
@Entity('post_like')
export class PostLikeEntity extends BaseEntity {
  @Index()
  @Column({ comment: '动态ID' })
  postId: number;

  @Index()
  @Column({ comment: '用户ID' })
  userId: number;
}
