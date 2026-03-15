import { BaseEntity } from '../../base/entity/base';
import { Column, Entity, Index } from 'typeorm';

/**
 * 设备信息
 */
@Entity('device_info')
export class DeviceInfoEntity extends BaseEntity {
  @Index({ unique: true })
  @Column({ comment: '序列号' })
  sn: string;

  @Index()
  @Column({ comment: '关联用户ID', nullable: true })
  userId: number;

  @Column({ comment: '型号', nullable: true })
  model: string;

  @Column({ comment: '绑定时间', nullable: true })
  bindDate: Date;
  // 状态 0未激活 1使用中 2无人使用 3离床 4离线
  @Column({ comment: '状态', dict: ['未激活', '使用中', '无人使用', '离床', '离线'], default: 0 })
  status: number;

  @Column({ comment: '状态更新时间', nullable: true })
  statusUpdateTime: Date;

  @Column({ comment: 'MAC地址', nullable: true })
  mac: string;

  @Column({ comment: '绑定时间', nullable: true })
  bindTime: Date;
}
