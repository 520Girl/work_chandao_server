
import { CoolController, BaseController } from '@cool-midway/core';
import { TeamInfoEntity } from '../../entity/info';

/**
 * 团队信息
 */
@CoolController({
  api: ['add', 'delete', 'update', 'info', 'list', 'page'],
  entity: TeamInfoEntity,
  pageQueryOp: {
    keyWordLikeFields: ['name'],
    fieldEq: ['type', 'ownerId'],
  },
})
export class AdminTeamInfoController extends BaseController {}
