import { Config, Provide } from '@midwayjs/core';
import axios from 'axios';

@Provide()
export class GeoService {
  @Config('geo.provider')
  provider: string;

  @Config('geo.tencent.key')
  tencentKey: string;

  @Config('geo.cacheTtlSeconds')
  cacheTtlSeconds: number;

  private cache = new Map<string, { exp: number; data: any }>();

  private cacheKey(lat: number, lng: number) {
    const la = Math.round(lat * 1000) / 1000;
    const lo = Math.round(lng * 1000) / 1000;
    return `${la},${lo}`;
  }

  async reverseGeocode(lat: number, lng: number) {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    if (this.provider !== 'tencent') return null;
    if (!this.tencentKey) return null;

    const key = this.cacheKey(lat, lng);
    const now = Date.now();
    const cached = this.cache.get(key);
    if (cached && cached.exp > now) return cached.data;

    const url = 'https://apis.map.qq.com/ws/geocoder/v1/';
    const res = await axios.get(url, {
      params: {
        location: `${lat},${lng}`,
        key: this.tencentKey,
        get_poi: 0,
      },
      timeout: 8000,
    });
    const data = res?.data;
    if (!data || data.status !== 0) return null;

    const comp = data?.result?.address_component;
    const province = comp?.province ?? null;
    const city = comp?.city ?? null;
    const out = { province, city };

    const ttl = Number(this.cacheTtlSeconds) > 0 ? Number(this.cacheTtlSeconds) : 86400;
    this.cache.set(key, { exp: now + ttl * 1000, data: out });
    return out;
  }
}
