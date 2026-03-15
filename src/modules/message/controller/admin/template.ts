import { BaseController, CoolController } from '@cool-midway/core';
import { Provide } from '@midwayjs/core';
import { MessageTemplateEntity } from '../../entity/template';
import { MessageTemplateService } from '../../service/template';

@Provide()
@CoolController({
  api: ['add', 'delete', 'update', 'info', 'page'],
  entity: MessageTemplateEntity,
  service: MessageTemplateService,
  pageQueryOp: {
    keyWordLikeFields: ['keyName', 'name'],
    fieldEq: ['enabled', 'contentType'],
  },
})
export class AdminMessageTemplateController extends BaseController {}

