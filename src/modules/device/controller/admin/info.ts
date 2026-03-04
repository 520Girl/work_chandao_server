import { BaseController, CoolController } from '@cool-midway/core';
import { Body, Inject, Post, Provide } from '@midwayjs/core';
import { DeviceInfoEntity } from '../../entity/info';
import { UserInfoEntity } from '../../../user/entity/info';
import { DeviceInfoService } from '../../service/info';
import { Validate } from '@midwayjs/validate';

/**
 * 设备管理
 */
@Provide()
@CoolController({
  api: ['add', 'delete', 'update', 'info', 'list', 'page'],
  entity: DeviceInfoEntity,
  service: DeviceInfoService,
  pageQueryOp: {
    fieldEq: ['a.sn', 'a.mac', 'a.status'],
    select: ['a.*', 'b.nickName as userName'],
    join: [
      {
        entity: UserInfoEntity,
        alias: 'b',
        condition: 'a.userId = b.id',
      },
    ],
  },
})
export class AdminDeviceInfoController extends BaseController {
  @Inject()
  deviceInfoService: DeviceInfoService;
}
