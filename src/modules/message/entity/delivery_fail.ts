import { BaseEntity } from '../../base/entity/base';
import { Column, Entity, Index } from 'typeorm';

@Entity('message_delivery_fail')
@Index(['messageId', 'userId'])
export class MessageDeliveryFailEntity extends BaseEntity {
  @Index()
  @Column({ comment: '消息ID' })
  messageId: number;

  @Index()
  @Column({ comment: '用户ID', nullable: true })
  userId: number;

  @Column({ comment: '失败原因', nullable: true })
  reason: string;
}

