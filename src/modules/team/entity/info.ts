import { BaseEntity } from '../../base/entity/base';
import { Column, Entity, Index } from 'typeorm';

/**
 * 团队信息
 */
@Entity('team_info')
export class TeamInfoEntity extends BaseEntity {
  @Index()
  @Column({ comment: '名称' })
  name: string;

  @Index()
  @Column({ comment: '负责人ID' })
  ownerId: number;

  @Column({
    comment: '类型',
    dict: ['未知', '小组', '营级', '团级'],
    default: 1,
  })
  type: number;

  @Column({ comment: '成员总数', default: 0 })
  memberCount: number;

  @Column({ comment: '成员上限（0表示不限制）', default: 0 })
  maxMemberCount: number;
}
