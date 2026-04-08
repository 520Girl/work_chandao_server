import { ALL, Config, Middleware, InjectClient } from '@midwayjs/core';
import { NextFunction, Context } from '@midwayjs/koa';
import { IMiddleware, Init, Inject } from '@midwayjs/core';
import * as jwt from 'jsonwebtoken';
import * as _ from 'lodash';
import { CoolCommException, CoolUrlTagData, TagTypes } from '@cool-midway/core';
import { CachingFactory, MidwayCache } from '@midwayjs/cache-manager';
import { Utils } from '../../../comm/utils';

/**
 * 用户
 */
@Middleware()
export class UserMiddleware implements IMiddleware<Context, NextFunction> {
  @Config(ALL)
  coolConfig;

  @Inject()
  coolUrlTagData: CoolUrlTagData;

  @Config('module.user.jwt')
  jwtConfig;

  ignoreUrls: string[] = [];

  @Config('koa.globalPrefix')
  prefix;

  @Inject()
  utils: Utils;

  @InjectClient(CachingFactory, 'default')
  midwayCache: MidwayCache;

  @Init()
  async init() {
    this.ignoreUrls = this.coolUrlTagData.byKey(TagTypes.IGNORE_TOKEN, 'app');
  }

  resolve() {
    return async (ctx: Context, next: NextFunction) => {
      let { url } = ctx;
      url = url.replace(this.prefix, '').split('?')[0];
      if (_.startsWith(url, '/app/')) {
        const token = ctx.get('Authorization');
        try {
          ctx.user = jwt.verify(token, this.jwtConfig.secret);

          if (ctx.user.isRefresh) {
            throw new CoolCommException('登录失效~', 401);
          }
        } catch (error) {}
        // 使用matchUrl方法来检查URL是否应该被忽略
        const isIgnored = this.ignoreUrls.some(pattern =>
          this.utils.matchUrl(pattern, url)
        );
        if (isIgnored) {
          await next();
          return;
        } else {
          if (!ctx.user) {
            ctx.status = 401;
            throw new CoolCommException('登录失效~',401);
          }

          // 退出登录后，记录 logoutAt；对已签发早于 logoutAt 的 token 判定为失效
          const logoutAt = await this.midwayCache.get(
            `user:logoutAt:${ctx.user.id}`
          );
          if (logoutAt) {
            const logoutAtMs = Number(logoutAt);
            const issuedAtMs =
              typeof ctx.user.iat === 'number' ? ctx.user.iat * 1000 : 0;
            if (issuedAtMs && issuedAtMs < logoutAtMs) {
              // 避免泄漏内部实现，只返回统一错误信息
              throw new CoolCommException('登录失效~', 401);
            }
          }
        }
      }
      await next();
    };
  }
}
