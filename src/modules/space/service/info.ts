import { SpaceInfoEntity } from './../entity/info';
import { SpaceTypeEntity } from './../entity/type';
import { Inject, Provide } from '@midwayjs/core';
import { BaseService, MODETYPE } from '@cool-midway/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import { PluginService } from '../../plugin/service/info';
import * as path from 'path';
import { v1 as uuid } from 'uuid';

/**
 * 文件信息
 */
@Provide()
export class SpaceInfoService extends BaseService {
  @InjectEntityModel(SpaceInfoEntity)
  spaceInfoEntity: Repository<SpaceInfoEntity>;

  @InjectEntityModel(SpaceTypeEntity)
  spaceTypeEntity: Repository<SpaceTypeEntity>;

  @Inject()
  pluginService: PluginService;

  /**
   * 场景到分类名映射
   */
  private sceneClassifyMap = {
    avatar: '用户头像',
    medal: '勋章图标',
    post: '动态图片',
    share: '分享图片',
    activity: '活动封面',
    product: '商品图片',
    default: '默认分类',
  };

  /**
   * 推断文件类型
   */
  private inferFileType(fileName: string) {
    const ext = path.extname(fileName || '').toLowerCase();
    const imageExts = [
      '.jpg',
      '.jpeg',
      '.png',
      '.gif',
      '.bmp',
      '.webp',
      '.svg',
      '.ico',
      '.avif',
    ];
    return imageExts.includes(ext) ? 'image' : 'file';
  }

  /**
   * 新增
   */
  async add(param) {
    const result = await this.pluginService.invoke('upload', 'getMode');
    const config = await this.pluginService.getConfig('upload');
    if (result.mode == MODETYPE.LOCAL) {
      param.key = param.url.replace(config.domain, '');
    }
    return super.add(param);
  }

  /**
   * 获得分类ID，支持场景自动归类
   * @param classifyIdRaw 直接传的分类ID（优先级最高）
   * @param scene 业务场景标识（avatar/medal/post/share等）
   */
  private async resolveClassifyId(classifyIdRaw: any, scene?: string) {
    // 优先使用明确传递的分类ID
    if (classifyIdRaw !== undefined && classifyIdRaw !== null && classifyIdRaw !== '') {
      const parsed = Number(classifyIdRaw);
      if (!Number.isNaN(parsed)) {
        const exists = await this.spaceTypeEntity.findOne({ where: { id: parsed } });
        if (exists) {
          return parsed;
        }
      }
    }

    // 根据场景自动归类
    const classifyName = scene && this.sceneClassifyMap[scene]
      ? this.sceneClassifyMap[scene]
      : this.sceneClassifyMap.default;

    let targetType = await this.spaceTypeEntity.findOne({
      where: { name: classifyName },
    });

    if (!targetType) {
      targetType = await this.spaceTypeEntity.save({
        name: classifyName,
        parentId: null,
      });
    }

    return targetType.id;
  }

  /**
   * 上传后自动记录文件空间
   */
  async recordUpload(url: string, ctx: any) {
    if (!url) {
      return;
    }

    const exists = await this.spaceInfoEntity.findOne({ where: { url } });
    if (exists) {
      return exists;
    }

    const uploadFile = ctx?.files?.[0] || {};
    const originalName = uploadFile?.filename
      ? path.basename(uploadFile.filename)
      : '';
    const urlName = (() => {
      try {
        return decodeURIComponent(url.split('?')[0].split('/').pop() || '');
      } catch (e) {
        return url.split('?')[0].split('/').pop() || '';
      }
    })();
    const name = originalName || urlName || `file_${Date.now()}`;
    const size = Number(uploadFile?.fileSize || uploadFile?.size || 0);

    const scene = ctx?.fields?.scene as string;
    const classifyId = await this.resolveClassifyId(ctx?.fields?.classifyId, scene);

    const result = await this.pluginService.invoke('upload', 'getMode');
    const config = await this.pluginService.getConfig('upload');
    const key =
      result.mode == MODETYPE.LOCAL ? url.replace(config.domain, '') : url;

    return this.spaceInfoEntity.save({
      url,
      type: ctx?.fields?.type || this.inferFileType(name),
      classifyId,
      fileId: uuid(),
      name,
      size,
      version: 1,
      key,
    });
  }
}
