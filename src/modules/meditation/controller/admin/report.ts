import { CoolController, BaseController } from '@cool-midway/core';
import { MeditationReportEntity } from '../../entity/report';
import { MeditationSessionEntity } from '../../entity/session';
import { DeviceInfoEntity } from '../../../device/entity/info';

/**
 * 冥想报告管理
 */
@CoolController({
  api: ['add', 'delete', 'update', 'info', 'list', 'page'],
  entity: MeditationReportEntity,
  pageQueryOp: {
    select: ['a.*', 'b.sn', 'c.model'],
    join: [
      {
        entity: MeditationSessionEntity,
        alias: 'b',
        condition: 'a.sessionId = b.id',
      },
      {
        entity: DeviceInfoEntity,
        alias: 'c',
        condition: 'b.sn = c.sn',
      },
    ],
  },
})
export class AdminMeditationReportController extends BaseController {}
