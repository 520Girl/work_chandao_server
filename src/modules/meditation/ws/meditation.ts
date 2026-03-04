import { Config, Inject } from '@midwayjs/core';
import { WSController, OnWSConnection } from '@midwayjs/core';
import { Context } from '@midwayjs/socketio';
import * as jwt from 'jsonwebtoken';
import { MeditationWsService } from '../service/ws';

/**
 * 冥想实时数据 WebSocket
 */
@WSController('/ws/meditation')
export class MeditationWsController {
  @Inject()
  ctx: Context;

  @Inject()
  meditationWsService: MeditationWsService;

  @Config('module.user.jwt')
  jwtConfig;

  @OnWSConnection()
  async onConnection() {
    const token = this.getToken();
    if (!token) {
      this.ctx.disconnect(true);
      return;
    }
    try {
      const payload = jwt.verify(token, this.jwtConfig.secret) as any;
      if (payload?.isRefresh) {
        this.ctx.disconnect(true);
        return;
      }
      (this.ctx as any).user = payload;
      this.meditationWsService.bind(payload.id, this.ctx);
      this.ctx.on('disconnect', () => {
        this.meditationWsService.unbind(payload.id, this.ctx);
      });
    } catch (error) {
      this.ctx.disconnect(true);
    }
  }

  private getToken(): string {
    const headerToken = this.ctx.handshake?.headers?.authorization as string;
    const queryToken =
      (this.ctx.handshake?.query?.token as string) ||
      (this.ctx.handshake?.query?.access_token as string);
    const token = headerToken || queryToken || '';
    return token.replace(/^Bearer\s+/i, '');
  }
}
