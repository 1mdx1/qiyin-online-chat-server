import { Inject, Controller, Post, Body, Logger } from '@midwayjs/core';
import { ApiOkResponse, ApiTags } from '@midwayjs/swagger';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository, FindOptionsWhere, In } from 'typeorm';
import type { Context } from '@midwayjs/koa';
import type { ILogger } from '@midwayjs/logger';
import { ErrorCode, CustomError } from '../common/error';
import { RedisKey } from '../common/redisKey';
/** entity */
import { Conversation } from '../entity/conversation.entity';
import { Message, MessageStatus } from '../entity/message.entity';
/** dto */
import {
  DeleteConversationListReqDto,
  DeleteConversationResDto,
} from '../dto/conversation/delete.dto';
import {
  GetConversationListReqDto,
  GetConversationListResDto,
  ConversationListDto,
} from '../dto/conversation/list.dto';
import {
  UpdateConversationNameReqDto,
  UpdateConversationNameResDto,
} from '../dto/conversation/updateName.dto';
import {
  UpdateTagsReqDto,
  UpdateTagsResDto,
} from '../dto/conversation/updateTags.dto';
import {
  CreateConversationReqDto,
  CreateConversationResDto,
} from '../dto/conversation/create.dto';
import {
  SendMessageReqDto,
  SendMessageResDto,
  ConversationMessageListReqDto,
  ConversationMessageListResDto,
} from '../dto/conversation/send.dto';
/** service */
import { RedisService } from '@midwayjs/redis';
import { AiService } from '../service/ai.service';
import { RobotService } from '../service/robot.service';
import { MessageService } from '../service/message.service';

@Controller('/conversation')
@ApiTags(['conversation'])
export class ConversationController {
  @InjectEntityModel(Conversation)
  private readonly conversationModel: Repository<Conversation>;

  @InjectEntityModel(Message)
  private readonly messageModel: Repository<Message>;

  @Inject()
  private readonly ctx: Context;

  @Inject()
  private readonly redisService: RedisService;

  @Inject()
  private readonly aiService: AiService;

  @Inject()
  private readonly robotService: RobotService;

  @Inject()
  private readonly messageService: MessageService;

  @Logger()
  logger: ILogger;

  @Post('/list')
  @ApiOkResponse({ type: GetConversationListResDto })
  async list(@Body() data: GetConversationListReqDto) {
    const { uid } = this.ctx;
    let where: FindOptionsWhere<Conversation> = { uid };
    if (data.tags && data.tags.length > 0) {
      const promiseArr: Promise<string[]>[] = [];
      for (const tag of data.tags) {
        const key = `${RedisKey.ConversationTag}:${uid}:${tag}`;
        promiseArr.push(this.redisService.smembers(key));
      }
      const cidArrs = await Promise.all(promiseArr);
      let cids: string[] = [];
      for (const cidArr of cidArrs) {
        cids = cids.concat(cidArr);
      }
      if (cids.length > 0) {
        where = { id: In(cids), uid };
      }
    }
    const conversations = await this.conversationModel.find({
      where,
      order: { createdAt: 'DESC' },
    });
    const resData: ConversationListDto = {
      list: conversations,
    };
    return resData;
  }

  @Post('/create')
  @ApiOkResponse({ type: CreateConversationResDto })
  async ceate(@Body() data: CreateConversationReqDto) {
    const { uid } = this.ctx;
    const conversation = new Conversation();
    conversation.uid = uid;
    conversation.name = data.message.slice(0, 10);
    await this.conversationModel.save(conversation);
    // 首条消息直接发送：落库用户消息并触发 AI 回复
    const sendResult = await this.handleSend(
      uid,
      conversation.id,
      data.message
    );
    return {
      conversation,
      ...sendResult,
    };
  }

  /** 发送一条消息到指定会话：落库用户消息 + 携带历史调用 AI 并落库回复 */
  private async handleSend(uid: string, cid: string, message: string) {
    // 1. 保存用户消息
    const userMsg = new Message();
    userMsg.cid = cid;
    userMsg.uid = uid;
    userMsg.message = message;
    userMsg.status = MessageStatus.Normal;
    await this.messageModel.save(userMsg);

    // 2. 获取最近历史（含刚发送的用户消息）作为上下文
    const historyMsgs = await this.messageModel.find({
      where: { cid },
      order: { createdAt: 'ASC' },
      take: 20,
    });
    const history = historyMsgs.map(m => ({
      role: m.uid === uid ? 'user' : 'assistant',
      content: m.message,
    }));

    const assistant = await this.robotService.getAssistantRobot();
    let status = MessageStatus.Normal;
    let content: string;
    try {
      content = await this.aiService.chat({
        message,
        robot: this.robotService.buildRobotInfo(assistant),
        history,
      });
    } catch (err) {
      // 3. AI 重试后仍失败：标记回复位置，保持对话数据一致性
      this.logger.error(`[conversation:${cid}] AI 调用失败：${err.message}`);
      status = MessageStatus.AiError;
      content = 'AI 暂时不可用，请稍后再试。该条消息已标记为失败回复。';
    }

    const aiMsg = new Message();
    aiMsg.cid = cid;
    aiMsg.uid = assistant.id;
    aiMsg.message = content;
    aiMsg.status = status;
    await this.messageModel.save(aiMsg);

    return {
      userMessage: await this.messageService.toDto(userMsg),
      reply: await this.messageService.toDto(aiMsg),
    };
  }

  @Post('/delete')
  @ApiOkResponse({ type: DeleteConversationResDto })
  async delete(@Body() data: DeleteConversationListReqDto) {
    const { uid } = this.ctx;
    const conversation = await this.conversationModel.findOne({
      where: { uid, id: data.id },
    });
    if (!conversation) {
      throw new CustomError(ErrorCode.ConversationNotExist);
    }
    await this.messageModel.delete({ cid: data.id });
    await this.conversationModel.delete({ id: data.id });
  }

  @Post('/update-name')
  @ApiOkResponse({ type: UpdateConversationNameResDto })
  async updateName(@Body() data: UpdateConversationNameReqDto) {
    const { uid } = this.ctx;
    const conversation = await this.conversationModel.findOne({
      where: { uid, id: data.id },
    });
    if (!conversation) {
      throw new CustomError(ErrorCode.ConversationNotExist);
    }
    conversation.name = data.name;
    await this.conversationModel.save(conversation);
  }

  @Post('/update-tags')
  @ApiOkResponse({ type: UpdateTagsResDto })
  async updateTags(@Body() data: UpdateTagsReqDto) {
    const { uid } = this.ctx;
    const conversation = await this.conversationModel.findOne({
      where: { uid, id: data.id },
    });
    if (!conversation) {
      throw new CustomError(ErrorCode.ConversationNotExist);
    }
    // 识别待新增tag和待删除tag
    const oldTagSet = new Set<string>();
    const newTagSet = new Set<string>();
    for (const tag of conversation.tags) {
      oldTagSet.add(tag);
    }
    for (const tag of data.tags) {
      newTagSet.add(tag);
    }
    const addTags: string[] = [];
    const delTags: string[] = [];
    for (const tag of data.tags) {
      if (!oldTagSet.has(tag)) {
        addTags.push(tag);
      }
    }
    for (const tag of conversation.tags) {
      if (!newTagSet.has(tag)) {
        delTags.push(tag);
      }
    }
    // 数据库整体替换更新
    conversation.tags = data.tags;
    await this.conversationModel.save(conversation);
    // 更新缓存
    const promiseArr: Promise<number>[] = [];
    for (const tag of addTags) {
      const key = `${RedisKey.ConversationTag}:${uid}:${tag}`;
      promiseArr.push(this.redisService.sadd(key, data.id));
    }
    for (const tag of delTags) {
      const key = `${RedisKey.ConversationTag}:${uid}:${tag}`;
      promiseArr.push(this.redisService.srem(key, data.id));
    }
    await Promise.all(promiseArr);
  }

  /**
   * 发送消息到个人会话：
   * 用户消息必先落库（即使 AI 失败也保证用户消息存在，数据一致），
   * 携带最近对话历史调用 AI（内部含重试/超时处理）。
   */
  @Post('/send')
  @ApiOkResponse({ type: SendMessageResDto })
  async send(@Body() data: SendMessageReqDto) {
    const { uid } = this.ctx;
    const conversation = await this.conversationModel.findOne({
      where: { uid, id: data.id },
    });
    if (!conversation) {
      throw new CustomError(ErrorCode.ConversationNotExist);
    }
    return this.handleSend(uid, data.id, data.message);
  }

  @Post('/message-list')
  @ApiOkResponse({ type: ConversationMessageListResDto })
  async messageList(@Body() data: ConversationMessageListReqDto) {
    const { uid } = this.ctx;
    const conversation = await this.conversationModel.findOne({
      where: { uid, id: data.id },
    });
    if (!conversation) {
      throw new CustomError(ErrorCode.ConversationNotExist);
    }
    const take = Math.min(Math.max(data.pageSize, 1), 200);
    const skip = (Math.max(data.page, 1) - 1) * take;
    const [list, total] = await this.messageModel.findAndCount({
      where: { cid: data.id },
      order: { createdAt: 'ASC' },
      skip,
      take,
    });
    return {
      list: await this.messageService.toDtoList(list),
      total,
      page: Math.max(data.page, 1),
      pageSize: take,
    };
  }
}
