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

  @Column({ comment: '状态', dict: ['离线', '在线', '禁用'], default: 0 })
  status: number;

  @Column({ comment: 'MAC地址', nullable: true })
  mac: string;

  @Column({ comment: '绑定时间', nullable: true })
  bindTime: Date;
}
