import { CoolController, BaseController } from '@cool-midway/core';
import { PostInfoEntity } from '../../entity/info';
import { UserInfoEntity } from '../../../user/entity/info';

/**
 * 动态审核
 */
@CoolController({
  api: ['add', 'delete', 'update', 'info', 'list', 'page'],
  entity: PostInfoEntity,
  pageQueryOp: {
    fieldEq: ['a.status', 'a.type'],
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
export class AdminPostInfoController extends BaseController {}
