import { BaseEntity } from '../../base/entity/base';
import { Column, Entity, Index } from 'typeorm';

/**
 * 社区动态
 */
@Entity('post_info')
export class PostInfoEntity extends BaseEntity {
  @Column({
    comment: '类型',
    dict: ['未知', '分享报告', '手动发布'],
    default: 2,
  })
  type: number;

  @Index()
  @Column({ comment: '用户ID' })
  userId: number;

  @Index()
  @Column({ comment: '关联团队ID', nullable: true })
  teamId: number;

  @Column({ comment: '文字内容', type: 'text', nullable: true })
  content: string;

  @Column({ comment: '图片列表', type: 'json', nullable: true })
  images: string[];

  @Column({
    comment: '状态',
    dict: ['未知', '待审核', '已发布', '拒绝'],
    default: 1,
  })
  status: number;
}
