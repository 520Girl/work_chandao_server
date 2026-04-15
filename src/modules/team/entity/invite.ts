import { BaseEntity } from '../../base/entity/base';
import { Column, Entity, Index } from 'typeorm';

/**
 * 团队邀请
 */
@Entity('team_invite')
export class TeamInviteEntity extends BaseEntity {
  @Index()
  @Column({ comment: '团队ID；个人成团未完成前可为空', nullable: true })
  teamId: number | null;

  @Column({ comment: '0=加入已有团队 1=个人成团', default: 0 })
  inviteMode: number;

  @Column({ comment: '个人成团发起人 user_info.id', nullable: true })
  sponsorUserId: number | null;

  @Column({ comment: '可选：仅该用户可使用本邀请', nullable: true })
  bindUserId: number | null;

  @Column({ comment: 'App 创建人 user_info.id', nullable: true })
  creatorAppUserId: number | null;

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

  @Column({ comment: '邀请小程序码图片URL', length: 1024, nullable: true })
  miniProgramQrUrl?: string | null;
}
