import { Rule, RuleType } from '@midwayjs/validate';

export class AppMusicPageQueryDTO {
  /**
   * 页码
   * @default 1
   * @example 1
   */
  @Rule(RuleType.number().default(1))
  page?: number;

  /**
   * 每页大小
   * @default 20
   * @example 20
   */
  @Rule(RuleType.number().default(20))
  size?: number;
}

