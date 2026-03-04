import { Body, Inject, Post, Provide } from '@midwayjs/core';
import { CoolController, BaseController } from '@cool-midway/core';
import { BaseSysMenuEntity } from '../../../entity/sys/menu';
import { BaseSysMenuService } from '../../../service/sys/menu';
import { Validate } from '@midwayjs/validate';
import {
  BaseSysMenuParseDTO,
  BaseSysMenuCreateDTO,
  BaseSysMenuExportDTO,
  BaseSysMenuImportDTO,
} from '../../../dto/sys/menu';

/**
 * 菜单
 */
@Provide()
@CoolController({
  api: ['add', 'delete', 'update', 'info', 'list', 'page'],
  entity: BaseSysMenuEntity,
  service: BaseSysMenuService,
})
export class BaseSysMenuController extends BaseController {
  @Inject()
  baseSysMenuService: BaseSysMenuService;

  @Post('/parse', { summary: '解析' })
  @Validate()
  async parse(@Body() body: BaseSysMenuParseDTO) {
    return this.ok(
      await this.baseSysMenuService.parse(body.entity, body.controller, body.module)
    );
  }

  @Post('/create', { summary: '创建代码' })
  @Validate()
  async create(@Body() body: BaseSysMenuCreateDTO) {
    await this.baseSysMenuService.create(body);
    return this.ok();
  }

  @Post('/export', { summary: '导出' })
  @Validate()
  async export(@Body() body: BaseSysMenuExportDTO) {
    return this.ok(await this.baseSysMenuService.export(body.ids));
  }

  @Post('/import', { summary: '导入' })
  @Validate()
  async import(@Body() body: BaseSysMenuImportDTO) {
    await this.baseSysMenuService.import(body.menus);
    return this.ok();
  }
}
