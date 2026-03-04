import { Rule, RuleType } from '@midwayjs/validate';
/**
 * 登录请求
 * @example
 * {
 *   "username": "admin",
 *   "password": "admin123",
 *   "captchaId": "550e8400-e29b-41d4-a716-446655440000",
 *   "verifyCode": 1234
 * }
 */
export class LoginDTO {
  /**
   * 用户名
   * @example "admin"
   */
  @Rule(RuleType.string().required())
  username: string;

  /**
   * 密码
   * @example "admin123"
   */
  @Rule(RuleType.string().required())
  password: string;

  /**
   * 验证码ID，通过 /captcha 接口获取
   * @example "550e8400-e29b-41d4-a716-446655440000"
   */
  @Rule(RuleType.string().required())
  captchaId: string;

  /**
   * 验证码数字
   * @example 1234
   */
  @Rule(RuleType.required())
  verifyCode: number;
}
