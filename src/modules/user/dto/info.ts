import { Rule, RuleType } from '@midwayjs/validate';

/**
 * 更新用户个人信息请求
 * @example
 * {
 *   "nickName": "张三",
 *   "avatarUrl": "https://example.com/avatar.jpg",
 *   "gender": 1,
 *   "bio": "热爱冥想和瑜伽"
 * }
 */
export class UserUpdatePersonDTO {
  /**
   * 昵称
   * @example "张三"
   */
  @Rule(RuleType.string())
  nickName?: string;

  /**
   * 头像URL
   * @example "https://example.com/avatar.jpg"
   */
  @Rule(RuleType.string())
  avatarUrl?: string;

  /**
   * 性别 (0-未知, 1-男, 2-女)
   * @example 1
   */
  @Rule(RuleType.number())
  gender?: number;

  /**
   * 个人签名
   * @example "热爱冥想和瑜伽"
   */
  @Rule(RuleType.string())
  bio?: string;
}

/**
 * 更新用户密码请求
 * @example
 * {
 *   "password": "newPassword123",
 *   "code": "123456"
 * }
 */
export class UserUpdatePasswordDTO {
  /**
   * 新密码
   * @example "newPassword123"
   */
  @Rule(RuleType.string().required())
  password: string;

  /**
   * 短信验证码
   * @example "123456"
   */
  @Rule(RuleType.string().required())
  code: string;
}

/**
 * 绑定手机号请求
 * @example
 * {
 *   "phone": "13800138000",
 *   "code": "123456"
 * }
 */
export class UserBindPhoneDTO {
  /**
   * 手机号
   * @example "13800138000"
   */
  @Rule(RuleType.string().required())
  phone: string;

  /**
   * 短信验证码
   * @example "123456"
   */
  @Rule(RuleType.string().required())
  code: string;
}

/**
 * 微信小程序注册/登录请求
 * @example
 * {
 *   "code": "0813eSJH0dRpAF0uN2JH0s5vJH03eSJ",
 *   "encryptedData": "CRcs928s...",
 *   "iv": "aBc123..."
 * }
 */
export class UserMiniPhoneDTO {
  /**
   * 微信授权码
   * @example "0813eSJH0dRpAF0uN2JH0s5vJH03eSJ"
   */
  @Rule(RuleType.string().required())
  code: string;

  /**
   * 加密的用户数据
   * @example "CRcs928s..."
   */
  @Rule(RuleType.string().required())
  encryptedData: string;

  /**
   * 微信数据加密的初始向量
   * @example "aBc123..."
   */
  @Rule(RuleType.string().required())
  iv: string;
}
