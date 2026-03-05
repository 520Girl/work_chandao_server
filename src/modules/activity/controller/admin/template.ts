import { BaseController, CoolController } from '@cool-midway/core';
import { ActivityTemplateEntity } from '../../entity/template';

/**
 * 活动模板管理
 */
@CoolController({
  api: ['add', 'delete', 'update', 'info', 'list', 'page'],
  entity: ActivityTemplateEntity,
})
export class AdminActivityTemplateController extends BaseController {}
