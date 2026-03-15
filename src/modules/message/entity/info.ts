import { BaseEntity, transformerJson, transformerTime } from '../../base/entity/base';
import { Column, Entity, Index } from 'typeorm';

@Entity('message_info')
export class MessageInfoEntity extends BaseEntity {
  @Index()
  @Column({ comment: '标题' })
  title: string;

  @Column({ comment: '内容(纯文本)', type: 'text', nullable: true })
  content: string;

  @Index()
  @Column({ comment: '内容类型 0纯文本 1图文 2图文链接 3文本链接', default: 0 })
  contentType: number;

  @Column({ comment: '内容结构化数据', type: 'longtext', nullable: true, transformer: transformerJson })
  contentData: any;

  @Index()
  @Column({ comment: '模板Key', nullable: true })
  templateKey: string;

  @Index()
  @Column({ comment: '业务类型', nullable: true })
  bizType: string;

  @Index()
  @Column({ comment: '业务ID', nullable: true })
  bizId: number;

  @Index()
  @Column({ comment: '投递范围 0全体 1指定用户 2团队成员 3团队负责人', default: 0 })
  targetType: number;

  @Index()
  @Column({ comment: '团队ID', nullable: true })
  teamId: number;

  @Index()
  @Column({ comment: '发送者类型 0系统 1管理员 2用户', default: 0 })
  senderType: number;

  @Index()
  @Column({ comment: '发送者ID', nullable: true })
  senderId: number;

  @Column({ comment: '发送时间', type: 'varchar', transformer: transformerTime, nullable: true })
  sendTime: Date;

  @Index()
  @Column({ comment: '创建人(管理员ID)', nullable: true })
  creatorId: number;
}
