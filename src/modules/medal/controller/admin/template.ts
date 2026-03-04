
import { CoolController, BaseController } from '@cool-midway/core';
import { MedalTemplateEntity } from '../../entity/template';

/**
 * 勋章模板管理
 */
@CoolController({
  api: ['add', 'delete', 'update', 'info', 'list', 'page'],
  entity: MedalTemplateEntity,
  pageQueryOp: {
      keyWordLikeFields: ['name'],
      fieldEq: ['type', 'level', 'isActive']
  }
})
export class AdminMedalTemplateController extends BaseController {}
