import { Provide } from '@midwayjs/core';
import { BaseService } from '@cool-midway/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import { MessageTemplateEntity } from '../entity/template';

@Provide()
export class MessageTemplateService extends BaseService {
  @InjectEntityModel(MessageTemplateEntity)
  messageTemplateEntity: Repository<MessageTemplateEntity>;
}

