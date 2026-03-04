import { BaseEntity } from '../../base/entity/base';
import { Column, Entity } from 'typeorm';

/**
 * 原始数据接收日志
 */
@Entity('device_log')
export class DeviceLogEntity extends BaseEntity {
  @Column({ comment: '设备MAC' })
  mac: string;

  @Column({ comment: '时间戳', nullable: true })
  pushTime: Date;

  @Column({ comment: '原始JSON数据', type: 'text', nullable: true })
  rawData: string;

  @Column({ comment: '是否处理成功', dict: ['否', '是'], default: 0 })
  isSuccess: number;
}
