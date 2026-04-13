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
    where: async (ctx) => {
      const body = ctx?.request?.body ?? {};
      const result: any[] = [];

      if (body.sn) {
        result.push(['a.sn LIKE :sn', { sn: `%${body.sn}%` }]);
      }
      if (body.type != null && body.type !== '') {
        result.push(['a.type = :type', { type: body.type }]);
      }
      if (body.status != null && body.status !== '') {
        result.push(['a.status = :status', { status: body.status }]);
      }
      if (body.endReason != null && body.endReason !== '') {
        result.push(['a.endReason = :endReason', { endReason: body.endReason }]);
      }
      if (body.nickName) {
        result.push(['b.nickName LIKE :nickName', { nickName: `%${body.nickName}%` }]);
      }

      return result;
    },
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
