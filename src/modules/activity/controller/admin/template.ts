import { BaseController, CoolController } from '@cool-midway/core';
import { ActivityTemplateEntity } from '../../entity/template';

/**
 * 活动模板管理
 */
@CoolController({
  prefix: '/admin/activity/template',
  api: ['add', 'delete', 'update', 'info', 'list', 'page'],
  entity: ActivityTemplateEntity,
})
export class AdminActivityTemplateController extends BaseController {}
