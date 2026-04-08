import { BaseEntity } from '../../base/entity/base';
import { Column, Entity, Index } from 'typeorm';

@Entity('team_invite_join')
@Index(['inviteId', 'userId'], { unique: true })
export class TeamInviteJoinEntity extends BaseEntity {
  @Index()
  @Column({ comment: '邀请ID' })
  inviteId: number;

  @Index()
  @Column({ comment: '加入用户ID' })
  userId: number;
}

