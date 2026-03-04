import { Rule, RuleType } from '@midwayjs/validate';

/**
 * 小程序登录请求
 * @example
 * {
 *   "code": "0813eSJH0dRpAF0uN2JH0s5vJH03eSJ",
 *   "encryptedData": "CRcs928s...",
 *   "iv": "aBc123..."
 * }
 */
export class UserMiniLoginDTO {
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

/**
 * 公众号登录请求
 * @example
 * {
 *   "code": "0813eSJH0dRpAF0uN2JH0s5vJH03eSJ"
 * }
 */
export class UserMPLoginDTO {
  /**
   * 微信授权码
   * @example "0813eSJH0dRpAF0uN2JH0s5vJH03eSJ"
   */
  @Rule(RuleType.string().required())
  code: string;
}

/**
 * 微信APP登录请求
 * @example
 * {
 *   "code": "0813eSJH0dRpAF0uN2JH0s5vJH03eSJ"
 * }
 */
export class UserWxAppLoginDTO {
  /**
   * 微信授权码
   * @example "0813eSJH0dRpAF0uN2JH0s5vJH03eSJ"
   */
  @Rule(RuleType.string().required())
  code: string;
}

/**
 * 手机号登录请求
 * @example
 * {
 *   "phone": "13800138000",
 *   "smsCode": "123456"
 * }
 */
export class UserPhoneLoginDTO {
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
  smsCode: string;
}

/**
 * 一键手机号登录请求
 * @example
 * {
 *   "access_token": "accessToken123",
 *   "openid": "openid123",
 *   "appId": "appId123"
 * }
 */
export class UserUniPhoneLoginDTO {
  /**
   * 授权令牌
   * @example "accessToken123"
   */
  @Rule(RuleType.string().required())
  access_token: string;

  /**
   * 微信OpenID
   * @example "openid123"
   */
  @Rule(RuleType.string().required())
  openid: string;

  /**
   * 应用ID
   * @example "appId123"
   */
  @Rule(RuleType.string().required())
  appId: string;
}

/**
 * 刷新Token请求
 * @example
 * {
 *   "refreshToken": "refreshToken123"
 * }
 */
export class UserRefreshTokenDTO {
  /**
   * 刷新令牌
   * @example "refreshToken123"
   */
  @Rule(RuleType.string().required())
  refreshToken: string;
}

/**
 * 图片验证码请求
 * @example
 * {
 *   "captchaId": "550e8400-e29b-41d4-a716-446655440000"
 * }
 */
export class UserCaptchaDTO {
  /**
   * 验证码ID
   * @example "550e8400-e29b-41d4-a716-446655440000"
   */
  @Rule(RuleType.string().required())
  captchaId: string;
}

/**
 * 发送短信验证码请求
 * @example
 * {
 *   "phone": "13800138000"
 * }
 */
export class UserSmsCodeDTO {
  /**
   * 手机号
   * @example "13800138000"
   */
  @Rule(RuleType.string().required())
  phone: string;
}

/**
 * 发送短信验证码请求（带验证码）
 * @example
 * {
 *   "phone": "13800138000",
 *   "captchaId": "550e8400-e29b-41d4-a716-446655440000",
 *   "code": "1234"
 * }
 */
export class UserSmsCodeVerifyDTO {
  /**
   * 手机号
   * @example "13800138000"
   */
  @Rule(RuleType.string().required())
  phone: string;

  /**
   * 图片验证码ID
   * @example "550e8400-e29b-41d4-a716-446655440000"
   */
  @Rule(RuleType.string().required())
  captchaId: string;

  /**
   * 验证码
   * @example "1234"
   */
  @Rule(RuleType.string().required())
  code: string;
}

/**
 * 密码登录请求
 * @example
 * {
 *   "phone": "13800138000",
 *   "password": "password123"
 * }
 */
export class UserPasswordLoginDTO {
  /**
   * 手机号
   * @example "13800138000"
   */
  @Rule(RuleType.string().required())
  phone: string;

  /**
   * 密码
   * @example "password123"
   */
  @Rule(RuleType.string().required())
  password: string;
}
