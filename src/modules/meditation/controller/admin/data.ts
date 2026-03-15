import { CoolController, BaseController } from '@cool-midway/core';
import { Get, Query } from '@midwayjs/core';
import { Validate } from '@midwayjs/validate';
import * as zlib from 'zlib';
import { MeditationDataEntity } from '../../entity/data';
import { MeditationSessionEntity } from '../../entity/session';
import { DeviceInfoEntity } from '../../../device/entity/info';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import { MeditationDataWaveDTO } from '../../dto/data';

/**
 * 冥想数据管理
 */
@CoolController({
  api: ['list', 'page', 'info', 'delete'],
  entity: MeditationDataEntity,
  pageQueryOp: {
    select: [
      'a.id',
      'a.sessionId',
      'a.recordTimestamp',
      'a.heartRate',
      'a.breathRate',
      'a.inBed',
      'a.bodyMovement',
      'b.sn',
      'b.startDate',
      'd.model',
    ],
    join: [
      {
        entity: MeditationSessionEntity,
        alias: 'b',
        condition: 'a.sessionId = b.id',
      },
      {
        entity: DeviceInfoEntity,
        alias: 'd',
        condition: 'b.sn = d.sn',
      },
    ],
  },
})
export class AdminMeditationDataController extends BaseController {
  @InjectEntityModel(MeditationDataEntity)
  meditationDataEntity: Repository<MeditationDataEntity>;

  @Get('/wave', { summary: '获取冥想波形数据' })
  @Validate()
  async wave(@Query() query: MeditationDataWaveDTO) {
    const row = await this.meditationDataEntity.findOne({ where: { id: query.id } });
    if (!row) return this.ok(null);

    let decoded: any = null;
    const blob: any = (row as any).waveBlob;
    if (blob) {
      try {
        const buf = Buffer.isBuffer(blob) ? blob : Buffer.from(blob);
        decoded = JSON.parse(zlib.gunzipSync(buf).toString('utf8'));
      } catch (e) {}
    }

    const leftResp = decoded?.left?.respiratory_wave ?? [];
    const leftHr = decoded?.left?.heart_rate_wave ?? [];
    const rightResp = decoded?.right?.respiratory_wave ?? [];
    const rightHr = decoded?.right?.heart_rate_wave ?? [];

    return this.ok({
      id: row.id,
      recordTimestamp: (row as any).recordTimestamp ?? null,
      left: { respiratory_wave: leftResp, heart_rate_wave: leftHr },
      right: { respiratory_wave: rightResp, heart_rate_wave: rightHr },
    });
  }
}
