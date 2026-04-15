import { BaseService, CoolCommException } from '@cool-midway/core';
import { Config, Inject, Provide } from '@midwayjs/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import axios from 'axios';
import * as crypto from 'crypto';
import * as moment from 'moment';
import { Equal, Repository } from 'typeorm';
import { v1 as uuid } from 'uuid';
import { PluginService } from '../../plugin/service/info';
import { UserInfoEntity } from '../entity/info';
import { UserWxEntity } from '../entity/wx';

/**
 * 微信
 */
@Provide()
export class UserWxService extends BaseService {
  @Config('module.user')
  config;

  @InjectEntityModel(UserInfoEntity)
  userInfoEntity: Repository<UserInfoEntity>;

  @InjectEntityModel(UserWxEntity)
  userWxEntity: Repository<UserWxEntity>;

  @Inject()
  pluginService: PluginService;

  /**
   * 获得插件实例
   * @returns
   */
  async getPlugin() {
    try {
      const wxPlugin: any = await this.pluginService.getInstance('wx');
      return wxPlugin;
    } catch (error) {
      throw new CoolCommException(
        '未配置微信插件，请到插件市场下载安装配置：https://cool-js.com/plugin/70'
      );
    }
  }

  /**
   * 获得小程序实例
   * @returns
   */
  async getMiniApp() {
    const wxPlugin: any = await this.getPlugin();
    return wxPlugin.MiniApp();
  }

  /**
   * 获得公众号实例
   * @returns
   */
  async getOfficialAccount() {
    const wxPlugin: any = await this.getPlugin();
    return wxPlugin.OfficialAccount();
  }

  /**
   * 获得App实例
   * @returns
   */
  async getOpenPlatform() {
    const wxPlugin: any = await this.getPlugin();
    return wxPlugin.OpenPlatform();
  }

  /**
   * 获得用户的openId
   * @param userId
   * @param type 0-小程序 1-公众号 2-App
   */
  async getOpenid(userId: number, type = 0) {
    const user = await this.userInfoEntity.findOneBy({
      id: Equal(userId),
      status: 1,
    });
    if (!user) {
      throw new CoolCommException('用户不存在或已被禁用');
    }
    const wx = await this.userWxEntity
      .createQueryBuilder('a')
      .where('a.type = :type', { type })
      .andWhere('(a.unionid = :unionid or a.openid =:openid )', {
        unionid: user.unionid,
        openid: user.unionid,
      })
      .getOne();
    return wx ? wx.openid : null;
  }

  /**
   * 获得微信配置
   * @param appId
   * @param appSecret
   * @param url 当前网页的URL，不包含#及其后面部分(必须是调用JS接口页面的完整URL)
   */
  public async getWxMpConfig(url: string) {
    const token = await this.getWxToken();
    const ticket = await axios.get(
      'https://api.weixin.qq.com/cgi-bin/ticket/getticket',
      {
        params: {
          access_token: token,
          type: 'jsapi',
        },
      }
    );

    const account = (await this.getOfficialAccount()).getAccount();
    const appid = account.getAppId();
    // 返回结果集
    const result = {
      timestamp: parseInt(moment().valueOf() / 1000 + ''),
      nonceStr: uuid(),
      appId: appid, //appid
      signature: '',
    };
    const signArr = [];
    signArr.push('jsapi_ticket=' + ticket.data.ticket);
    signArr.push('noncestr=' + result.nonceStr);
    signArr.push('timestamp=' + result.timestamp);
    signArr.push('url=' + decodeURI(url));
    // 敏感信息加密处理
    result.signature = crypto
      .createHash('sha1')
      .update(signArr.join('&'))
      .digest('hex')
      .toUpperCase();
    return result;
  }

  /**
   * 获得公众号用户信息
   * @param code
   */
  async mpUserInfo(code) {
    const token = await this.openOrMpToken(code, 'mp');
    return await this.openOrMpUserInfo(token);
  }

  /**
   * 获得app用户信息
   * @param code
   */
  async appUserInfo(code) {
    const token = await this.openOrMpToken(code, 'open');
    return await this.openOrMpUserInfo(token);
  }

  /**
   * 获得微信token 不用code
   * @param appid
   * @param secret
   */
  public async getWxToken(type = 'mp') {
    let app;
    if (type == 'mp') {
      app = await this.getOfficialAccount();
    } else {
      app = await this.getOpenPlatform();
    }
    return await app.getAccessToken().getToken();
  }

  /**
   * 获得用户信息
   * @param token
   */
  async openOrMpUserInfo(token) {
    return await axios
      .get('https://api.weixin.qq.com/sns/userinfo', {
        params: {
          access_token: token.access_token,
          openid: token.openid,
          lang: 'zh_CN',
        },
      })
      .then(res => {
        return res.data;
      });
  }

  /**
   * 获得token嗯
   * @param code
   * @param type
   */
  async openOrMpToken(code, type = 'mp') {
    const account =
      type == 'mp'
        ? (await this.getOfficialAccount()).getAccount()
        : (await this.getMiniApp()).getAccount();
    const result = await axios.get(
      'https://api.weixin.qq.com/sns/oauth2/access_token',
      {
        params: {
          appid: account.getAppId(),
          secret: account.getSecret(),
          code,
          grant_type: 'authorization_code',
        },
      }
    );
    return result.data;
  }

  /**
   * 获得小程序session
   * @param code 微信code
   * @param conf 配置
   */
  async miniSession(code) {
    const app = await this.getMiniApp();
    const utils = app.getUtils();
    const result = await utils.codeToSession(code);
    return result;
  }

  /**
   * 获得小程序用户信息
   * @param code
   * @param encryptedData
   * @param iv
   */
  async miniUserInfo(code, encryptedData, iv) {
    const session = await this.miniSession(code);
    if (session.errcode) {
      throw new CoolCommException('登录失败，请重试');
    }
    const info: any = await this.miniDecryptData(
      encryptedData,
      iv,
      session.session_key
    );
    if (info) {
      delete info['watermark'];
      return {
        ...info,
        openid: session['openid'],
        unionid: session['unionid'],
      };
    }
    return null;
  }

  /**
   * 获得小程序手机
   * @param code
   * @param encryptedData
   * @param iv
   */
  async miniPhone(code, encryptedData, iv) {
    const session = await this.miniSession(code);
    if (session.errcode) {
      throw new CoolCommException('获取手机号失败，请刷新重试');
    }
    const result = await this.miniDecryptData(
      encryptedData,
      iv,
      session.session_key
    );
    return result.phoneNumber;
  }

  /**
   * 小程序信息解密
   * @param encryptedData
   * @param iv
   * @param sessionKey
   */
  async miniDecryptData(encryptedData, iv, sessionKey) {
    const app = await this.getMiniApp();
    const utils = app.getUtils();
    return await utils.decryptSession(sessionKey, iv, encryptedData);
  }

  /**
   * 小程序服务端 access_token（wxa 接口用）。
   * 使用官方 `cgi-bin/token` + `client_credential`，从插件读取 appid/secret，避免依赖各版本插件对 getAccessToken 的返回结构。
   */
  async getMiniProgramAccessToken(): Promise<string> {
    const mini: any = await this.getMiniApp();
    const account = mini.getAccount?.();
    if (!account?.getAppId || !account?.getSecret) {
      throw new CoolCommException('微信插件未提供小程序账号配置（appId/secret）');
    }
    const appid = account.getAppId();
    const secret = account.getSecret();
    const { data } = await axios.get('https://api.weixin.qq.com/cgi-bin/token', {
      params: {
        grant_type: 'client_credential',
        appid,
        secret,
      },
    });
    if (data?.errcode) {
      throw new CoolCommException(
        `获取小程序 access_token 失败: [${data.errcode}] ${data.errmsg || ''}`
      );
    }
    if (!data?.access_token) {
      throw new CoolCommException('获取小程序 access_token 失败: 响应无 access_token');
    }
    return String(data.access_token);
  }

  /**
   * 无限量小程序码（PNG），scene 最大 32 字符，仅数字/字母及部分符号
   * @see https://developers.weixin.qq.com/miniprogram/dev/OpenApiDoc/qrcode-link/qr-code/getUnlimitedQRCode.html
   */
  async getUnlimitedMiniProgramQrCodeBuffer(opts: {
    scene: string;
    page: string;
    envVersion?: 'release' | 'trial' | 'develop';
    checkPath?: boolean;
    width?: number;
  }): Promise<Buffer> {
    const accessToken = await this.getMiniProgramAccessToken();
    const res = await axios.post(
      `https://api.weixin.qq.com/wxa/getwxacodeunlimit?access_token=${accessToken}`,
      {
        scene: opts.scene,
        page: opts.page,
        env_version: opts.envVersion ?? 'release',
        check_path: opts.checkPath ?? false,
        width: opts.width ?? 430,
      },
      { responseType: 'arraybuffer', validateStatus: () => true }
    );
    const ct = String(res.headers['content-type'] || '');
    if (ct.includes('json') || ct.includes('text')) {
      let msg = '生成小程序码失败';
      try {
        const j = JSON.parse(Buffer.from(res.data).toString('utf8'));
        if (j.errmsg) msg = `${msg}: [${j.errcode}] ${j.errmsg}`;
      } catch {
        /* ignore */
      }
      throw new CoolCommException(msg);
    }
    return Buffer.from(res.data);
  }
}
