import { Inject, Controller, Post, Body } from '@midwayjs/core';
import { ApiOkResponse, ApiTags } from '@midwayjs/swagger';
import type { Context } from '@midwayjs/koa';
/** dto */
import { CreateGroupReqDto } from '../dto/group/create.dto';
import { GroupIdReqDto } from '../dto/group/groupId.dto';
import { UpdateGroupNameReqDto } from '../dto/group/updateName.dto';
import {
  UpdateGroupStrategyReqDto,
  UpdateGroupStrategyResDto,
} from '../dto/group/updateStrategy.dto';
import { GroupMembersReqDto } from '../dto/group/members.dto';
import { GroupInviteReqDto } from '../dto/group/invite.dto';
import {
  GroupMessageListReqDto,
  GroupMessageListResDto,
} from '../dto/group/messageList.dto';
import {
  GroupCreateResDto,
  GroupListResDto,
  GroupDetailResDto,
} from '../dto/group/group.dto';
import { ResponseDto } from '../dto/common.dto';
import { GroupReplyStrategy } from '../entity/group.entity';
/** service */
import { GroupService } from '../service/group.service';

@Controller('/group')
@ApiTags(['group'])
export class GroupController {
  @Inject()
  private readonly ctx: Context;

  @Inject()
  private readonly groupService: GroupService;

  @Post('/create')
  @ApiOkResponse({ type: GroupCreateResDto })
  async create(@Body() data: CreateGroupReqDto) {
    const { uid } = this.ctx;
    const group = await this.groupService.createGroup(
      uid,
      data.name,
      data.robotIds
    );
    return this.groupService.getGroupDetail(group.id, uid);
  }

  @Post('/list')
  @ApiOkResponse({ type: GroupListResDto })
  async list() {
    const { uid } = this.ctx;
    return { list: await this.groupService.listGroups(uid) };
  }

  @Post('/detail')
  @ApiOkResponse({ type: GroupDetailResDto })
  async detail(@Body() data: GroupIdReqDto) {
    const { uid } = this.ctx;
    return this.groupService.getGroupDetail(data.id, uid);
  }

  @Post('/delete')
  @ApiOkResponse({ type: ResponseDto })
  async delete(@Body() data: GroupIdReqDto) {
    const { uid } = this.ctx;
    await this.groupService.deleteGroup(uid, data.id);
  }

  @Post('/update-name')
  @ApiOkResponse({ type: ResponseDto })
  async updateName(@Body() data: UpdateGroupNameReqDto) {
    const { uid } = this.ctx;
    await this.groupService.updateName(uid, data.id, data.name);
  }

  @Post('/update-strategy')
  @ApiOkResponse({ type: UpdateGroupStrategyResDto })
  async updateStrategy(@Body() data: UpdateGroupStrategyReqDto) {
    const { uid } = this.ctx;
    return this.groupService.updateStrategy(
      uid,
      data.id,
      data.strategy as GroupReplyStrategy,
      data.maxRobotReplies
    );
  }

  @Post('/add-member')
  @ApiOkResponse({ type: ResponseDto })
  async addMember(@Body() data: GroupMembersReqDto) {
    const { uid } = this.ctx;
    await this.groupService.addMembers(uid, data.id, data.memberIds);
  }

  @Post('/invite')
  @ApiOkResponse({ type: ResponseDto })
  async invite(@Body() data: GroupInviteReqDto) {
    const { uid } = this.ctx;
    await this.groupService.inviteUser(uid, data.id, data.name);
  }

  @Post('/remove-member')
  @ApiOkResponse({ type: ResponseDto })
  async removeMember(@Body() data: GroupMembersReqDto) {
    const { uid } = this.ctx;
    await this.groupService.removeMembers(uid, data.id, data.memberIds);
  }

  @Post('/message-list')
  @ApiOkResponse({ type: GroupMessageListResDto })
  async messageList(@Body() data: GroupMessageListReqDto) {
    const { uid } = this.ctx;
    return this.groupService.messageList(
      data.id,
      uid,
      data.page,
      data.pageSize
    );
  }
}
