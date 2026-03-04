import { BaseEntity } from '../../base/entity/base';
import { Column, Entity, Index } from 'typeorm';

/**
 * 团队成员
 */
@Entity('team_member')
export class TeamMemberEntity extends BaseEntity {
  @Index()
  @Column({ comment: '团队ID' })
  teamId: number;

  @Index()
  @Column({ comment: '用户ID' })
  userId: number;

  @Column({ comment: '加入时间', nullable: true })
  joinedAt: Date;
}
