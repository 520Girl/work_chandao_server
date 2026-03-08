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

  @Column({ comment: '退出时间', nullable: true })
  leftAt: Date;

  @Column({ comment: '退出类型 0:在职 1:主动退出 2:管理员移除', default: 0 })
  exitType: number;

  @Column({ comment: '操作人ID（管理员移除时）', nullable: true })
  operatorId: number;
}
