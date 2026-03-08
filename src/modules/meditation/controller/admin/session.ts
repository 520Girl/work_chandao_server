import { CoolController, BaseController } from '@cool-midway/core';
import { MeditationSessionEntity } from '../../entity/session';
import { UserInfoEntity } from '../../../user/entity/info';
import { DeviceInfoEntity } from '../../../device/entity/info';

/**
 * 冥想记录管理
 */
@CoolController({
  api: ['list', 'page', 'info', 'delete'],
  entity: MeditationSessionEntity,
  pageQueryOp: {
    select: ['a.*', 'b.nickName', 'b.avatarUrl', 'c.model'],
    join: [
      {
        entity: UserInfoEntity,
        alias: 'b',
        condition: 'a.userId = b.id',
      },
      {
        entity: DeviceInfoEntity,
        alias: 'c',
        condition: 'a.sn = c.sn',
      },
    ],
  },
})
export class AdminMeditationSessionController extends BaseController {}
