import { Provide } from '@midwayjs/core';
import { BaseService, CoolCommException } from '@cool-midway/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import { ShopOrderEntity } from '../entity/order';
import { UserAddressEntity } from '../../user/entity/address';
import { ShopProductEntity } from '../entity/product';
import { UserInfoEntity } from '../../user/entity/info';
import { TeamInfoEntity } from '../../team/entity/info';
import * as _ from 'lodash';

/**
 * 订单服务
 */
@Provide()
export class ShopOrderService extends BaseService {
  @InjectEntityModel(ShopOrderEntity)
  shopOrderEntity: Repository<ShopOrderEntity>;

  @InjectEntityModel(UserAddressEntity)
  userAddressEntity: Repository<UserAddressEntity>;

  @InjectEntityModel(ShopProductEntity)
  shopProductEntity: Repository<ShopProductEntity>;

  @InjectEntityModel(UserInfoEntity)
  userInfoEntity: Repository<UserInfoEntity>;

  @InjectEntityModel(TeamInfoEntity)
  teamInfoEntity: Repository<TeamInfoEntity>;

  /**
   * 创建订单
   */
  async create(param) {
    const { userId, productId, addressId, remark } = param;
    const product = await this.shopProductEntity.findOneBy({ id: productId });
    if (!product) {
      throw new CoolCommException('商品不存在~');
    }
    const address = await this.userAddressEntity.findOneBy({
      id: addressId,
      userId,
    });
    if (!address) {
      throw new CoolCommException('地址不存在~');
    }

    let commissionRecipientId = null;
    // 如果商品设置了返佣
    if (product.isCommission === 1) {
      const user = await this.userInfoEntity.findOneBy({ id: userId });
      // 如果用户有所属团队
      if (user?.firstTeamId) {
        const team = await this.teamInfoEntity.findOneBy({
          id: user.firstTeamId,
        });
        // 且团队有归属人（通常是团长或创建者，此处逻辑可能需根据业务调整）
        // 假设 team.ownerId 是归属人
        commissionRecipientId = team?.ownerId || null; 
      }
    }

    const orderNo = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
    
    await this.shopOrderEntity.save({
      userId,
      productId,
      addressId,
      status: 1, // 待支付
      commissionRecipientId,
      orderNo,
      remark,
      price: product.price, // 建议在订单表存一份价格快照
    });
    
    return { orderNo };
  }

  /**
   * 订单分页列表
   */
  async page(query) {
    const { userId, status, keyWord, page = 1, size = 20 } = query;
    const sql = `
        SELECT
            a.id,
            a.createTime,
            a.status,
            a.orderNo,
            a.price,
            b.name as productName,
            b.mainImage as productImage,
            b.price as productPrice
        FROM
            shop_order a
            LEFT JOIN shop_product b ON a.productId = b.id
        WHERE 1=1
            ${this.setSql(userId, 'AND a.userId = ?', [userId])}
            ${this.setSql(status, 'AND a.status = ?', [status])}
            ${this.setSql(keyWord, 'AND (a.orderNo LIKE ? OR b.name LIKE ?)', [`%${keyWord}%`, `%${keyWord}%`])}
        ORDER BY a.createTime DESC
    `;
    return this.sqlRenderPage(sql, _.assign(query, { page, size }), false);
  }

  /**
   * 订单详情
   */
  async detail(id: number, userId: number) {
    const info = await this.shopOrderEntity.findOneBy({ id, userId });
    if (!info) {
        throw new CoolCommException('订单不存在~');
    }
    
    const product = await this.shopProductEntity.findOneBy({ id: info.productId });
    const address = await this.userAddressEntity.findOneBy({ id: info.addressId });
    
    return {
        ...info,
        productName: product?.name,
        productImage: product?.mainImage,
        productPrice: product?.price,
        contact: address?.contact,
        phone: address?.phone,
        province: address?.province,
        city: address?.city,
        district: address?.district,
        detailAddress: address?.address
    };
  }

  /**
   * 取消订单
   */
  async cancel(id: number, userId: number) {
    const info = await this.shopOrderEntity.findOneBy({ id, userId });
    if (!info) {
        throw new CoolCommException('订单不存在~');
    }
    if (info.status !== 1) {
        throw new CoolCommException('订单状态不可取消~');
    }
    info.status = 5; // 已取消
    await this.shopOrderEntity.save(info);
  }

  /**
   * 发货
   */
  async shipped(id: number) {
    await this.shopOrderEntity.update(id, { status: 3 });
  }
}
