import { CoolController, BaseController } from '@cool-midway/core';
import { UserAddressEntity } from '../../entity/address';
import { UserAddressService } from '../../service/address';
import { UserInfoEntity } from '../../entity/info';

/**
 * 用户-地址
 */
@CoolController({
  api: ['add', 'delete', 'update', 'info', 'list', 'page'],
  entity: UserAddressEntity,
  service: UserAddressService,
  pageQueryOp: {
    keyWordLikeFields: ['a.contact', 'a.phone', 'b.nickName', 'b.phone'],
    fieldEq: ['a.userId'],
    select: ['a.*', 'b.nickName', 'b.avatarUrl'],
    join: [
      {
        entity: UserInfoEntity,
        alias: 'b',
        condition: 'a.userId = b.id',
      },
    ],
  },
})
export class AdminUserAddressesController extends BaseController {}
