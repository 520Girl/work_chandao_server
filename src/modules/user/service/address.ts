import { Init, Inject, Provide } from '@midwayjs/core';
import { BaseService } from '@cool-midway/core';
import { Equal, Repository } from 'typeorm';
import { UserAddressEntity } from '../entity/address';
import { InjectEntityModel } from '@midwayjs/typeorm';

/**
 * 地址
 */
@Provide()
export class UserAddressService extends BaseService {
  @InjectEntityModel(UserAddressEntity)
  userAddressEntity: Repository<UserAddressEntity>;

  @Inject()
  ctx;

  @Init()
  async init() {
    await super.init();
    this.setEntity(this.userAddressEntity);
  }

  /**
   * 列表信息
   */
  async list(query = {}, option = {}, connectionName = undefined) {
    // 如果是 App 端调用，筛选当前用户
    if (this.ctx.user) {
        return this.userAddressEntity
          .createQueryBuilder()
          .where('userId = :userId', { userId: this.ctx.user.id })
          .addOrderBy('isDefault', 'DESC')
          .getMany();
    }
    // 如果是管理后台，走默认的 list 逻辑
    return super.list(query, option, connectionName);
  }

  /**
   * 修改之后：设置默认地址时，取消该用户其他地址的默认标记，并显式更新当前地址
   * 注意：后台管理员(ctx.admin)与 App 用户(ctx.user)分离，admin 更新时从 data.userId 取用户
   */
  async modifyAfter(data: any, type: 'add' | 'update' | 'delete') {
    if (type == 'add' || type == 'update') {
      const setDefault = data.isDefault === true || data.isDefault === 1;
      if (setDefault && data.id) {
        let userId = this.ctx.user ? this.ctx.user.id : data.userId;
        if (!userId) {
          const addr = await this.userAddressEntity.findOneBy({ id: data.id });
          userId = addr?.userId;
        }
        if (!userId) return;

        await this.userAddressEntity
          .createQueryBuilder()
          .update()
          .set({ isDefault: false })
          .where('userId = :userId', { userId })
          .andWhere('id != :id', { id: data.id })
          .execute();

        await this.userAddressEntity.update(
          { id: data.id },
          { isDefault: true }
        );
      }
    }
  }

  /**
   * 默认地址
   */
  async default(userId) {
    return await this.userAddressEntity.findOneBy({
      userId: Equal(userId),
      isDefault: true,
    });
  }
}
