import { Provide } from '@midwayjs/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository, In } from 'typeorm';
import { User, UserType } from '../entity/user.entity';

export interface RobotPreset {
  name: string;
  personality: string;
  keywords: string[];
}

/** 预设机器人角色（可在此硬编码/配置） */
export const ROBOT_PRESETS: RobotPreset[] = [
  {
    name: 'AI助手',
    personality: '通用助手，回答简明扼要、逻辑清晰，乐于提供各类帮助。',
    keywords: [],
  },
  {
    name: '客服机器人',
    personality: '耐心细致，擅长解答订单、退款、售后、物流等客户服务问题。',
    keywords: [
      '客服',
      '退款',
      '订单',
      '售后',
      '投诉',
      '物流',
      '发票',
      '发货',
      '帮助',
      '服务',
    ],
  },
  {
    name: '技术机器人',
    personality: '专业严谨，擅长编程、接口、数据库、架构等技术问题。',
    keywords: [
      '代码',
      '编程',
      '技术',
      'bug',
      '报错',
      '接口',
      '数据库',
      '前端',
      '后端',
      'node',
      'js',
      'python',
      '部署',
      '测试',
    ],
  },
  {
    name: '幽默机器人',
    personality: '风趣幽默，喜欢讲段子和冷笑话，总能用轻松的方式回应。',
    keywords: ['笑话', '段子', '幽默', '搞笑', '开心', '冷笑话', '逗', '乐'],
  },
];

@Provide()
export class RobotService {
  @InjectEntityModel(User)
  private readonly userModel: Repository<User>;

  /** 确保预设机器人已入库（按名称判断） */
  async ensureSeed(): Promise<void> {
    for (const preset of ROBOT_PRESETS) {
      const exist = await this.userModel.findOne({
        where: { name: preset.name, type: UserType.Robot },
      });
      if (!exist) {
        const robot = new User();
        robot.name = preset.name;
        robot.type = UserType.Robot;
        robot.password = '';
        robot.personality = preset.personality;
        await this.userModel.save(robot);
      }
    }
  }

  /** 获取全部机器人角色 */
  async listRobots(): Promise<User[]> {
    await this.ensureSeed();
    return this.userModel.find({ where: { type: UserType.Robot } });
  }

  /** 通用 AI 助手（个人对话使用） */
  async getAssistantRobot(): Promise<User> {
    await this.ensureSeed();
    const assistant = await this.userModel.findOne({
      where: { name: 'AI助手', type: UserType.Robot },
    });
    if (!assistant) {
      throw new Error('AI助手初始化失败');
    }
    return assistant;
  }

  async getRobotById(id: string): Promise<User> {
    return this.userModel.findOne({ where: { id, type: UserType.Robot } });
  }

  async getRobotsByIds(ids: string[]): Promise<User[]> {
    if (!ids || ids.length === 0) {
      return [];
    }
    // 过滤非法 UUID，避免 Postgres 因非法 uuid 字面量报错（未知 id 由上层按 RobotNotExist 处理）
    const validIds = ids.filter(id =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    );
    if (validIds.length === 0) {
      return [];
    }
    return this.userModel.find({
      where: { id: In(validIds), type: UserType.Robot },
    });
  }

  async isRobot(uid: string): Promise<boolean> {
    const user = await this.userModel.findOne({ where: { id: uid } });
    return !!user && user.type === UserType.Robot;
  }

  /**
   * 内容关键词匹配：返回命中的机器人列表。
   * 若消息包含机器人关键词，则认为该机器人匹配。
   */
  matchRobots(robots: User[], message: string): User[] {
    const lower = message.toLowerCase();
    return robots.filter(robot => {
      const preset = ROBOT_PRESETS.find(p => p.name === robot.name);
      return (
        preset && preset.keywords.some(kw => lower.includes(kw.toLowerCase()))
      );
    });
  }

  /** 从机器人列表中随机挑选一个 */
  randomRobot(robots: User[]): User {
    return robots[Math.floor(Math.random() * robots.length)];
  }

  /** 返回机器人在消息中命中的首个关键词，无命中返回空串 */
  matchKeyword(robot: User, message: string): string {
    const lower = message.toLowerCase();
    const preset = ROBOT_PRESETS.find(p => p.name === robot.name);
    if (!preset) {
      return '';
    }
    return preset.keywords.find(kw => lower.includes(kw.toLowerCase())) || '';
  }

  /** 生成机器人回复时携带的元信息 */
  buildRobotInfo(robot: User, matchedKeyword?: string) {
    const preset = ROBOT_PRESETS.find(p => p.name === robot.name);
    return {
      id: robot.id,
      name: robot.name,
      personality: robot.personality,
      keywords: preset?.keywords || [],
      matchedKeyword,
    };
  }

  /** AI 全部失败时的保底回复 */
  fallbackReply(robot: User): string {
    const templates = [
      `${robot.name}：这个话题我暂时不太确定，稍后我确认一下再回复你。`,
      `${robot.name}：我这边遇到点小状况，稍后再给你详细答复。`,
      `${robot.name}：先记下你的问题了，我马上研究一下。`,
    ];
    return templates[Math.floor(Math.random() * templates.length)];
  }
}
