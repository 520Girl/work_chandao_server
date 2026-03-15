import { BaseEntity, transformerJson } from '../../base/entity/base';
import { Column, Entity, Index } from 'typeorm';

@Entity('message_template')
export class MessageTemplateEntity extends BaseEntity {
  @Index({ unique: true })
  @Column({ comment: '模板Key' })
  keyName: string;

  @Column({ comment: '模板名称' })
  name: string;

  @Column({ comment: '标题模板', type: 'varchar', nullable: true })
  titleTpl: string;

  @Column({ comment: '内容模板(纯文本)', type: 'text', nullable: true })
  contentTpl: string;

  @Column({ comment: '内容类型 0纯文本 1图文 2图文链接 3文本链接', default: 0 })
  contentType: number;

  @Column({ comment: '内容结构模板', type: 'longtext', nullable: true, transformer: transformerJson })
  contentDataTpl: any;

  @Index()
  @Column({ comment: '是否启用 0否 1是', default: 1 })
  enabled: number;
}

