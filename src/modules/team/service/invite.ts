import { Inject, Provide } from '@midwayjs/core';
import { BaseService, CoolCommException } from '@cool-midway/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import { TeamInviteEntity } from '../entity/invite';
import { TeamMemberEntity } from '../entity/member';
import { TeamMemberService } from './member';
import { TeamInfoEntity } from '../entity/info';
import * as moment from 'moment';
import { v4 as uuidv4 } from 'uuid';

/**
 * 团队邀请服务
 */
@Provide()
export class TeamInviteService extends BaseService {
  @InjectEntityModel(TeamInviteEntity)
  teamInviteEntity: Repository<TeamInviteEntity>;

  @InjectEntityModel(TeamMemberEntity)
  teamMemberEntity: Repository<TeamMemberEntity>;

  @InjectEntityModel(TeamInfoEntity)
  teamInfoEntity: Repository<TeamInfoEntity>;

  @Inject()
  teamMemberService: TeamMemberService;

  /**
   * 生成邀请码
   * @param teamId 团队ID
   * @param creatorId 创建人ID
   * @param days 有效期（天）
   */
  async genInviteCode(teamId: number, creatorId: number, days: number = 7) {
    const team = await this.teamInfoEntity.findOneBy({ id: teamId });
    if (!team) {
      throw new CoolCommException('团队已解散或ID错误');
    }
    const code = uuidv4().replace(/-/g, '').substring(0, 12);
    const expireTime = moment().add(days, 'days').toDate();
    await this.teamInviteEntity.save({
      teamId,
      code,
      expireTime,
      creatorId,
      status: 0,
    });
    return { code, expireTime };
  }

  /**
   * 验证邀请码
   */
  async verifyInviteCode(code: string, userId: number) {
    const invite = await this.teamInviteEntity.findOneBy({ code });
    if (!invite) {
      throw new CoolCommException('邀请链接无效');
    }
    if (invite.status === 1 || moment().isAfter(moment(invite.expireTime))) {
      throw new CoolCommException('邀请链接已过期，请联系管理员重新生成');
    }
    const member = await this.teamMemberEntity.findOneBy({
      teamId: invite.teamId,
      userId,
    });
    if (member && member.exitType === 0) {
      throw new CoolCommException('您已是该团队成员，无需重复加入');
    }
    return invite;
  }

  /**
   * 通过邀请码加入团队
   */
  async joinByInvite(userId: number, code: string) {
    const invite = await this.verifyInviteCode(code, userId);
    await this.teamMemberService.join(userId, invite.teamId);
    await this.teamInviteEntity.update(invite.id, { joinedUserId: userId });
    return { teamId: invite.teamId };
  }
}
