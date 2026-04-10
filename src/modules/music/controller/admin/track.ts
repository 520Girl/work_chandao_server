import { Provide } from '@midwayjs/core';
import { CoolController, BaseController } from '@cool-midway/core';
import { MusicTrackEntity } from '../../entity/track';
import { MusicTrackService } from '../../service/track';

@Provide()
@CoolController({
  prefix: '/admin/music/track',
  api: ['add', 'delete', 'update', 'info', 'list', 'page'],
  entity: MusicTrackEntity,
  service: MusicTrackService,
})
export class AdminMusicTrackController extends BaseController {}

