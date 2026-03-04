import { Provide } from '@midwayjs/core';
import { Context } from '@midwayjs/socketio';

/**
 * 冥想实时数据 WebSocket 管理
 */
@Provide()
export class MeditationWsService {
  private connections = new Map<number, Set<Context>>();

  bind(userId: number, socket: Context) {
    if (!this.connections.has(userId)) {
      this.connections.set(userId, new Set());
    }
    this.connections.get(userId).add(socket);
  }

  unbind(userId: number, socket: Context) {
    const sockets = this.connections.get(userId);
    if (!sockets) return;
    sockets.delete(socket);
    if (sockets.size === 0) {
      this.connections.delete(userId);
    }
  }

  sendToUser(userId: number, payload: any) {
    const sockets = this.connections.get(userId);
    if (!sockets) return;
    for (const socket of sockets) {
      socket.emit('data', payload);
    }
  }
}
