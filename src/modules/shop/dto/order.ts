import { Rule, RuleType } from '@midwayjs/validate';

/**
 * 创建订单请求
 * @example
 * {
 *   "productId": 1,
 *   "addressId": 1
 * }
 */
export class ShopOrderCreateDTO {
  /**
   * 商品ID
   * @example 1
   */
  @Rule(RuleType.number().required())
  productId: number;

  /**
   * 地址ID
   * @example 1
   */
  @Rule(RuleType.number().required())
  addressId: number;
}

/**
 * 新增地址请求
 * @example
 * {
 *   "name": "张三",
 *   "phone": "13800138000",
 *   "province": "北京市",
 *   "city": "朝阳区",
 *   "district": "建国路",
 *   "detail": "中关村大街1号",
 *   "isDefault": true
 * }
 */
export class ShopAddressAddDTO {
  /**
   * 收货人名字
   * @example "张三"
   */
  @Rule(RuleType.string().required())
  name: string;

  /**
   * 联系电话
   * @example "13800138000"
   */
  @Rule(RuleType.string().required())
  phone: string;

  /**
   * 省份
   * @example "北京市"
   */
  @Rule(RuleType.string().required())
  province: string;

  /**
   * 城市
   * @example "朝阳区"
   */
  @Rule(RuleType.string().required())
  city: string;

  /**
   * 区县
   * @example "建国路"
   */
  @Rule(RuleType.string().required())
  district: string;

  /**
   * 详细地址
   * @example "中关村大街1号"
   */
  @Rule(RuleType.string().required())
  detail: string;

  /**
   * 是否设为默认地址
   * @example true
   */
  @Rule(RuleType.boolean())
  isDefault?: boolean;
}
