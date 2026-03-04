import { BaseEntity } from '../../base/entity/base';
import { Column, Entity } from 'typeorm';

/**
 * 商品信息
 */
@Entity('shop_product')
export class ShopProductEntity extends BaseEntity {
  @Column({ comment: '名称' })
  name: string;

  @Column({
    comment: '价格',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  price: number;

  @Column({ comment: '主图', nullable: true })
  mainImage: string;

  @Column({ comment: '是否参与返佣', dict: ['否', '是'], default: 0 })
  isCommission: number;
}
