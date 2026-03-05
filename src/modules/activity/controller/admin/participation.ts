import { Provide } from '@midwayjs/core';
import { CoolController, BaseController } from '@cool-midway/core';
import { ActivityParticipationEntity } from '../../entity/participation';
import { ActivityInfoEntity } from '../../entity/info';
import { UserInfoEntity } from '../../../user/entity/info';

/**
 * 活动参与记录管理
 */
@Provide()
@CoolController({
  api: ['add', 'delete', 'update', 'info', 'list', 'page'],
  entity: ActivityParticipationEntity,
  pageQueryOp: {
    keyWordLikeFields: ['b.title', 'c.nickName'],
    fieldEq: ['a.status'],
    select: [
      'a.*',
      'b.title as activityTitle',
      'c.nickName as userName',
      'c.avatarUrl as userAvatar',
    ],
    join: [
      {
        entity: ActivityInfoEntity,
        alias: 'b',
        condition: 'a.activityId = b.id',
        type: 'leftJoin',
      },
      {
        entity: UserInfoEntity,
        alias: 'c',
        condition: 'a.userId = c.id',
        type: 'leftJoin',
      },
    ],
  },
})
export class AdminActivityParticipationController extends BaseController {}
