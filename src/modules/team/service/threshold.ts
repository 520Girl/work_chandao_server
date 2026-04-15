import { Provide, Inject } from '@midwayjs/core';
import { DictInfoService } from '../../dict/service/info';

/** dict_type.key = team_threshold 下 dict_info.name 为键、value 为数字 */
const DEFAULTS: Record<string, number> = {
  team_regiment_min: 100,
  team_camp_min: 10,
  team_group_min: 4,
  role_regiment_min: 101,
  role_camp_min: 11,
  role_group_min: 3,
  personal_formation_min: 3,
};

@Provide()
export class TeamThresholdService {
  @Inject()
  dictInfoService: DictInfoService;

  /** 一次读取全部阈值，避免多次查字典 */
  async getAll(): Promise<Record<string, number>> {
    return this.loadMap();
  }

  private async loadMap(): Promise<Record<string, number>> {
    const out = { ...DEFAULTS };
    try {
      const data = await this.dictInfoService.data(['team_threshold']);
      const list = (data as any)?.team_threshold || [];
      for (const row of list) {
        const k = String(row?.name ?? '').trim();
        const n = Number(row?.value);
        if (k && Number.isFinite(n)) {
          out[k] = n;
        }
      }
    } catch {
      // 字典未配置或异常时使用默认
    }
    return out;
  }

  async getTeamRegimentMin() {
    return (await this.loadMap()).team_regiment_min;
  }
  async getTeamCampMin() {
    return (await this.loadMap()).team_camp_min;
  }
  async getTeamGroupMin() {
    return (await this.loadMap()).team_group_min;
  }
  async getRoleRegimentMin() {
    return (await this.loadMap()).role_regiment_min;
  }
  async getRoleCampMin() {
    return (await this.loadMap()).role_camp_min;
  }
  async getRoleGroupMin() {
    return (await this.loadMap()).role_group_min;
  }
  /** 个人成团：join 表人数（含发起人）达到即建团 */
  async getPersonalFormationMin() {
    return (await this.loadMap()).personal_formation_min;
  }
}
