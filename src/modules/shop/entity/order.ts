import { BaseEntity } from '../../base/entity/base';
import { Column, Entity, Index } from 'typeorm';

/**
 * 订单信息
 */
@Entity('shop_order')
export class ShopOrderEntity extends BaseEntity {
  @Index()
  @Column({ comment: '用户ID' })
  userId: number;

  @Index()
  @Column({ comment: '商品ID' })
  productId: number;

  @Column({ comment: '地址ID' })
  addressId: number;

  @Column({
    comment: '状态',
    dict: ['未知', '待支付', '待发货', '已发货', '已完成', '已取消'],
    default: 1,
  })
  status: number;

  @Index()
  @Column({ comment: '归属返佣人ID', nullable: true })
  commissionRecipientId: number;

  @Column({ comment: '订单号', unique: true })
  orderNo: string;

  @Column({ comment: '订单价格', type: 'decimal', precision: 10, scale: 2, default: 0 })
  price: number;

  @Column({ comment: '物流单号', nullable: true })
  logisticsNo: string;

  @Column({ comment: '备注', nullable: true })
  remark: string;
}
