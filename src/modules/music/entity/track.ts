import { BaseEntity } from '../../base/entity/base';
import { Column, Entity, Index } from 'typeorm';

/**
 * 音乐曲目（资源引用存储在 space_info/url，本表仅做业务编排）
 */
@Entity('music_track')
export class MusicTrackEntity extends BaseEntity {
  @Column({ comment: '标题' })
  title: string;

  @Index()
  @Column({ comment: '音频URL' })
  audioUrl: string;

  @Column({ comment: '封面URL', nullable: true })
  coverUrl: string;

  @Column({ comment: '时长(秒)', default: 0 })
  durationSeconds: number;

  @Column({ comment: '排序(越大越靠前)', default: 0 })
  sort: number;

  @Column({ comment: '是否启用 0否 1是', default: 1 })
  enabled: number;
}

