import { BaseEntity } from '../../base/entity/base';
import { Column, Entity, Index } from 'typeorm';

/**
 * 团队邀请
 */
@Entity('team_invite')
export class TeamInviteEntity extends BaseEntity {
  @Index()
  @Column({ comment: '团队ID' })
  teamId: number;

  @Index({ unique: true })
  @Column({ comment: '邀请码' })
  code: string;

  @Column({ comment: '过期时间' })
  expireTime: Date;

  @Column({ comment: '创建人ID' })
  creatorId: number;

  @Column({ comment: '状态 0:有效 1:已失效', default: 0 })
  status: number;

  @Column({ comment: '通过此邀请加入的用户ID（审计用）', nullable: true })
  joinedUserId: number;
}
