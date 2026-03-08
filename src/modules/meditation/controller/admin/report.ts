import { CoolController, BaseController } from '@cool-midway/core';
import { MeditationReportEntity } from '../../entity/report';
import { MeditationSessionEntity } from '../../entity/session';
import { DeviceInfoEntity } from '../../../device/entity/info';
import { UserInfoEntity } from '../../../user/entity/info';

/**
 * 冥想报告管理
 */
@CoolController({
  api: ['add', 'delete', 'update', 'info', 'list', 'page'],
  entity: MeditationReportEntity,
  pageQueryOp: {
    select: ['a.*', 'b.sn', 'c.model', 'd.nickName', 'd.avatarUrl'],
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
      {
        entity: UserInfoEntity,
        alias: 'd',
        condition: 'b.userId = d.id',
      },
    ],
  },
})
export class AdminMeditationReportController extends BaseController {}
