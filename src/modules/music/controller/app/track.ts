import { Get, Provide, Query } from '@midwayjs/core';
import { BaseController, CoolController } from '@cool-midway/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import { MusicTrackEntity } from '../../entity/track';
import { AppMusicPageQueryDTO } from '../../dto/track';

@Provide()
@CoolController({
  prefix: '/app/music',
  api: [],
})
export class AppMusicTrackController extends BaseController {
  @InjectEntityModel(MusicTrackEntity)
  musicTrackEntity: Repository<MusicTrackEntity>;

  @Get('/page', { summary: '音乐列表（分页）' })
  async musicPage(@Query() query: AppMusicPageQueryDTO) {
    const page = Math.max(Number(query?.page ?? 1), 1);
    const size = Math.min(Math.max(Number(query?.size ?? 20), 1), 100);
    const qb = this.musicTrackEntity
      .createQueryBuilder('t')
      .where('t.enabled = 1')
      .orderBy('t.sort', 'DESC')
      .addOrderBy('t.id', 'DESC');

    const total = await qb.getCount();
    const list = await qb
      .offset((page - 1) * size)
      .limit(size)
      .getMany();

    return this.ok({ list, pagination: { page, size, total } });
  }
}
