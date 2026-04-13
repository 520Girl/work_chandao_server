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
    where: async (ctx) => {
      const body = ctx?.request?.body ?? {};
      const result: any[] = [];

      if (body.sn) {
        result.push(['b.sn LIKE :sn', { sn: `%${body.sn}%` }]);
      }
      if (body.sessionType != null && body.sessionType !== '') {
        result.push(['b.type = :sessionType', { sessionType: body.sessionType }]);
      }
      if (body.endReason != null && body.endReason !== '') {
        result.push(['b.endReason = :endReason', { endReason: body.endReason }]);
      }
      if (body.focusScore != null && body.focusScore !== '') {
        result.push(['a.focusScore >= :focusScore', { focusScore: body.focusScore }]);
      }

      return result;
    },
    select: [
      'a.*',
      'b.sn',
      'b.type as sessionType',
      'b.endReason as endReason',
      'c.model',
      'd.nickName',
      'd.avatarUrl',
    ],
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
        type: 'leftJoin',
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
