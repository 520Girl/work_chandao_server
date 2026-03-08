import { Config, Controller, Get, Inject } from '@midwayjs/core';
import { Context } from '@midwayjs/koa';
import { SwaggerBuilder } from '../builder';
import { BaseController } from '@cool-midway/core';

/**
 * 欢迎界面
 */
@Controller('/swagger')
export class SwaggerIndexController extends BaseController {
  @Inject()
  ctx: Context;

  @Inject()
  swaggerBuilder: SwaggerBuilder;

  @Config('cool.eps')
  epsConfig: boolean;

  @Get('/', { summary: 'swagger界面' })
  public async index() {
    if (!this.epsConfig) {
      return this.fail('Eps未开启');
    }
    await this.ctx.render('swagger', {});
  }

  @Get('/json', { summary: '获得Swagger JSON数据' })
  public async json() {
    if (!this.epsConfig) {
      return this.fail('Eps未开启');
    }
    return this.swaggerBuilder.json;
  }

  @Get('/socket/json', { summary: 'Socket 接口 JSON 文档' })
  public async socketJson() {
    return {
      transport: 'socket.io',
      namespace: '/',
      endpoint: '/ws/meditation',
      auth: {
        required: true,
        methods: [
          'Authorization Header: Bearer <access_token>',
          'Query: token=<access_token>',
          'Query: access_token=<access_token>',
        ],
        note: 'refresh token 不允许用于 socket 连接',
      },
      clientToServer: [],
      serverToClient: [
        {
          event: 'data',
          from: 'MeditationWsService.sendToUser',
          payloadExample: {
            type: 'meditationRealtime',
            data: {},
          },
        },
        {
          event: 'newMedal',
          from: 'MedalNotifyEvent.onMedalAwarded',
          room: 'user:{userId}',
          payloadExample: {
            userId: 1001,
            medalName: '连续冥想达人',
            icon: 'https://cdn.example.com/medal.png',
          },
        },
        {
          event: 'activityCheckinReminder',
          from: 'ActivityCheckinReminderEvent.onCheckinReminder',
          room: 'user:{userId}',
          payloadExample: {
            type: 'activityCheckinReminder',
            activityId: 12,
            activityTitle: '晨间冥想打卡',
            message: '今日活动尚未打卡，请及时完成~',
          },
        },
      ],
    };
  }

  @Get('/socket', { summary: 'Socket 接口文档页面' })
  public async socket() {
    const doc = await this.socketJson();
    const html = `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Socket 接口文档</title>
    <style>
      :root {
        --bg: #f5f7fb;
        --panel: #ffffff;
        --text: #1f2937;
        --sub: #6b7280;
        --line: #e5e7eb;
        --brand: #0f766e;
        --brand-soft: #ccfbf1;
      }
      body {
        margin: 0;
        font-family: "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
        background: radial-gradient(circle at top right, #dff7f3 0%, var(--bg) 40%);
        color: var(--text);
      }
      .wrap {
        max-width: 980px;
        margin: 24px auto;
        padding: 0 16px;
      }
      .card {
        background: var(--panel);
        border: 1px solid var(--line);
        border-radius: 14px;
        padding: 18px;
        margin-bottom: 14px;
      }
      h1 {
        margin: 0 0 12px;
      }
      h2 {
        margin: 0 0 10px;
        font-size: 18px;
      }
      .meta {
        font-size: 14px;
        color: var(--sub);
      }
      code {
        background: #eef2ff;
        padding: 2px 6px;
        border-radius: 6px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      th,
      td {
        border-bottom: 1px solid var(--line);
        padding: 10px;
        text-align: left;
        vertical-align: top;
      }
      th {
        background: #f8fafc;
        font-size: 13px;
        color: #334155;
      }
      .badge {
        display: inline-block;
        padding: 3px 8px;
        border-radius: 999px;
        background: var(--brand-soft);
        color: var(--brand);
        font-size: 12px;
        margin-right: 8px;
      }
      pre {
        margin: 0;
        background: #0b1020;
        color: #e2e8f0;
        padding: 12px;
        border-radius: 10px;
        overflow: auto;
      }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="card">
        <h1>Socket 接口文档</h1>
        <div class="meta">
          <span class="badge">${doc.transport}</span>
          命名空间 <code>${doc.namespace}</code>，连接地址 <code>${doc.endpoint}</code>
        </div>
      </div>

      <div class="card">
        <h2>鉴权方式</h2>
        <ul>
          ${doc.auth.methods.map(item => `<li>${item}</li>`).join('')}
        </ul>
        <div class="meta">说明：${doc.auth.note}</div>
      </div>

      <div class="card">
        <h2>服务端推送事件</h2>
        <table>
          <thead>
            <tr>
              <th>事件名</th>
              <th>来源</th>
              <th>房间</th>
              <th>Payload 示例</th>
            </tr>
          </thead>
          <tbody>
            ${doc.serverToClient
              .map(
                item => `<tr>
                  <td><code>${item.event}</code></td>
                  <td>${item.from}</td>
                  <td>${item.room || '-'}</td>
                  <td><pre>${JSON.stringify(item.payloadExample, null, 2)}</pre></td>
                </tr>`
              )
              .join('')}
          </tbody>
        </table>
      </div>

      <div class="card">
        <h2>原始 JSON</h2>
        <div class="meta">接口：<code>/swagger/socket/json</code></div>
      </div>
    </div>
  </body>
</html>`;

    this.ctx.type = 'text/html; charset=utf-8';
    this.ctx.body = html;
  }
}
