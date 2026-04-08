import { BaseEntity } from '../../base/entity/base';
import { Column, Entity, Index } from 'typeorm';

/**
 * 用户信息
 */
@Entity('user_info')
export class UserInfoEntity extends BaseEntity {
  @Index({ unique: true })
  @Column({ comment: '微信Openid', nullable: true })
  unionid: string;

  @Column({ comment: '头像', nullable: true })
  avatarUrl: string;

  @Column({ comment: '昵称', nullable: true })
  nickName: string;

  @Index({ unique: true })
  @Column({ comment: '手机号', nullable: true })
  phone: string;

  @Column({ comment: '密码', nullable: true })
  password: string;

  @Column({
    comment: '角色',
    dict: ['未知', '成员', '组长', '营长', '团长', '超管'],
    default: 1,
  })  
  role: number;

  @Column({ comment: '邀请人ID', nullable: true })
  invitedBy: number;

  @Column({ comment: '首个所属团队ID', nullable: true })
  firstTeamId: number;

  @Column({ comment: '是否人工指定角色', dict: ['否', '是'], default: 0 })
  isManualRole: number;

  @Column({ comment: '性别', dict: ['未知', '男', '女'], default: 0 })
  gender: number;

  @Column({ comment: '状态', dict: ['禁用', '正常', '已注销'], default: 1 })
  status: number;
}
