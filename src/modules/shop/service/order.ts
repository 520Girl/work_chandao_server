import { Provide } from '@midwayjs/core';
import { BaseService, CoolCommException } from '@cool-midway/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import { ShopOrderEntity } from '../entity/order';
import { ShopAddressEntity } from '../entity/address';
import { ShopProductEntity } from '../entity/product';
import { UserInfoEntity } from '../../user/entity/info';
import { TeamInfoEntity } from '../../team/entity/info';

/**
 * 订单服务
 */
@Provide()
export class ShopOrderService extends BaseService {
  @InjectEntityModel(ShopOrderEntity)
  shopOrderEntity: Repository<ShopOrderEntity>;

  @InjectEntityModel(ShopAddressEntity)
  shopAddressEntity: Repository<ShopAddressEntity>;

  @InjectEntityModel(ShopProductEntity)
  shopProductEntity: Repository<ShopProductEntity>;

  @InjectEntityModel(UserInfoEntity)
  userInfoEntity: Repository<UserInfoEntity>;

  @InjectEntityModel(TeamInfoEntity)
  teamInfoEntity: Repository<TeamInfoEntity>;

  /**
   * 创建订单
   */
  async createOrder(userId: number, productId: number, addressId: number) {
    const product = await this.shopProductEntity.findOneBy({ id: productId });
    if (!product) {
      throw new CoolCommException('商品不存在');
    }
    const address = await this.shopAddressEntity.findOneBy({
      id: addressId,
      userId,
    });
    if (!address) {
      throw new CoolCommException('地址不存在');
    }

    let commissionRecipientId = null;
    if (product.isCommission === 1) {
      const user = await this.userInfoEntity.findOneBy({ id: userId });
      if (user?.firstTeamId) {
        const team = await this.teamInfoEntity.findOneBy({
          id: user.firstTeamId,
        });
        commissionRecipientId = team?.ownerId || null;
      }
    }

    const orderNo = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
    return this.shopOrderEntity.save({
      userId,
      productId,
      addressId,
      status: 1,
      commissionRecipientId,
      orderNo,
    });
  }

  /**
   * 用户订单列表
   */
  async listByUser(userId: number) {
    return this.shopOrderEntity.findBy({ userId });
  }

  /**
   * 发货
   */
  async shipped(id: number) {
    await this.shopOrderEntity.update(id, { status: 3 });
  }
}
