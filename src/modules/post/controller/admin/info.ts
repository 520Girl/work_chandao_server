import { Body, Get, Inject, Post } from '@midwayjs/core';
import { CoolController, BaseController } from '@cool-midway/core';
import { PostInfoEntity } from '../../entity/info';
import { UserInfoEntity } from '../../../user/entity/info';
import { TeamInfoEntity } from '../../../team/entity/info';
import { PostInfoService } from '../../service/info';

/**
 * 动态审核
 */
@CoolController({
  api: ['add', 'delete', 'update', 'info', 'list', 'page'],
  entity: PostInfoEntity,
  pageQueryOp: {
    fieldEq: ['a.status', 'a.type', 'a.teamId'],
    keyWordLikeFields: ['a.content', 'b.nickName'],
    select: ['a.*', 'b.nickName', 'b.avatarUrl', 'c.name as teamName'],
    join: [
      {
        entity: UserInfoEntity,
        alias: 'b',
        condition: 'a.userId = b.id',
      },
      {
        entity: TeamInfoEntity,
        alias: 'c',
        condition: 'a.teamId = c.id',
        type: 'leftJoin',
      },
    ],
  },
})
export class AdminPostInfoController extends BaseController {
  @Inject()
  postInfoService: PostInfoService;

  @Inject()
  ctx;

  @Post('/page', { summary: '动态分页（含点赞数）' })
  async pageWithLikes() {
    const res = (await super.page()) as any;
    if (res?.code === 1000 && res?.data?.list?.length) {
      for (const row of res.data.list) {
        const likeUsers = await this.postInfoService.getLikeUsers(row.id);
        row.likeCount = likeUsers.length;
        row.likeUsers = likeUsers;
      }
    }
    return res;
  }

  @Post('/approve', { summary: '审核通过' })
  async approve(@Body() body: { id: number }) {
    await this.postInfoService.approve(body.id);
    return this.ok();
  }

  @Post('/reject', { summary: '审核拒绝' })
  async reject(@Body() body: { id: number }) {
    await this.postInfoService.reject(body.id);
    return this.ok();
  }

  @Post('/getLikeUsers', { summary: '获取点赞用户列表' })
  async getLikeUsers(@Body() body: { postId: number }) {
    const list = await this.postInfoService.getLikeUsers(body.postId);
    return this.ok(list);
  }
}
