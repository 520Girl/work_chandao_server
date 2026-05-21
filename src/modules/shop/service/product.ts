import { Provide } from '@midwayjs/core';
import { BaseService } from '@cool-midway/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import { ShopProductEntity } from '../entity/product';

/**
 * 商品服务
 */
@Provide()
export class ShopProductService extends BaseService {
  @InjectEntityModel(ShopProductEntity)
  shopProductEntity: Repository<ShopProductEntity>;

  private parseImages(raw: any): string[] {
    if (Array.isArray(raw)) {
      return raw.map((u: any) => String(u || '').trim()).filter(Boolean);
    }
    if (typeof raw === 'string' && raw.trim()) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.map((u: any) => String(u || '').trim()).filter(Boolean);
        }
      } catch {
        return [raw.trim()];
      }
    }
    return [];
  }

  private normalizeProductPayload(data: any) {
    if (!data || typeof data !== 'object') return data;
    const images = this.parseImages(data.images);
    const main = String(data.mainImage || '').trim();
    if (!images.length && main) images.push(main);
    data.images = images.length ? images : null;
    data.mainImage = images[0] ?? null;
    return data;
  }

  private enrichProductRow(row: any) {
    if (!row) return row;
    let images = this.parseImages(row.images);
    if (!images.length && row.mainImage) images = [String(row.mainImage)];
    row.images = images;
    row.mainImage = images[0] ?? row.mainImage ?? null;
    return row;
  }

  async add(param: any) {
    return super.add(this.normalizeProductPayload({ ...param }));
  }

  async update(param: any) {
    return super.update(this.normalizeProductPayload({ ...param }));
  }

  async info(id: any) {
    return this.enrichProductRow(await super.info(id));
  }

  /**
   * 分页查询
   */
  async page(query) {
    return this.sqlRenderPage(
      `
        SELECT
            a.id,
            a.name,
            a.price,
            a.mainImage,
            a.images,
            a.intro,
            a.isCommission
        FROM
            shop_product a
        WHERE 1=1
            ${this.setSql(query.keyWord, 'AND a.name LIKE ?', [`%${query.keyWord}%`])}
        ORDER BY a.createTime DESC
      `,
      query,
      false
    );
  }
}
