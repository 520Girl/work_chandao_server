import { BaseEntity, transformerTime } from '../../base/entity/base';
import { Column, Entity, Index } from 'typeorm';

@Entity('message_user')
@Index(['messageId', 'userId'], { unique: true })
export class MessageUserEntity extends BaseEntity {
  @Index()
  @Column({ comment: '消息ID', default: 0 })
  messageId: number;

  @Index()
  @Column({ comment: '用户ID', default: 0 })
  userId: number;

  @Index()
  @Column({ comment: '已读状态 0未读 1已读', default: 0 })
  readStatus: number;

  @Column({ comment: '已读时间', type: 'varchar', transformer: transformerTime, nullable: true })
  readTime: Date;

  @Index()
  @Column({ comment: '删除状态 0正常 1删除', default: 0 })
  deleteStatus: number;

  @Column({ comment: '删除时间', type: 'varchar', transformer: transformerTime, nullable: true })
  deleteTime: Date;
}
