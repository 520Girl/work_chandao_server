import { CoolController, BaseController } from '@cool-midway/core';
import { MeditationDataEntity } from '../../entity/data';
import { MeditationSessionEntity } from '../../entity/session';
import { DeviceInfoEntity } from '../../../device/entity/info';

/**
 * 冥想数据管理
 */
@CoolController({
  api: ['list', 'page', 'info', 'delete'],
  entity: MeditationDataEntity,
  pageQueryOp: {
    select: ['a.*', 'b.sn', 'b.startDate', 'd.model'],
    join: [
      {
        entity: MeditationSessionEntity,
        alias: 'b',
        condition: 'a.sessionId = b.id',
      },
      {
        entity: DeviceInfoEntity,
        alias: 'd',
        condition: 'b.sn = d.sn',
      },
    ],
  },
})
export class AdminMeditationDataController extends BaseController {}
