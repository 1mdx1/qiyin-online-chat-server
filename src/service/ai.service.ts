import { Provide, Config, Logger, sleep } from '@midwayjs/core';
import type { ILogger } from '@midwayjs/logger';
import { ErrorCode, CustomError } from '../common/error';
import { chat as algochatChat } from './algochat.client';

/**
 * AI 调用失败（重试后仍失败）时抛出。
 * 与项目其它异常保持一致的 CustomError 结构。
 */
export class AiError extends CustomError {
  constructor(message: string) {
    super(ErrorCode.AiCallFailed, message);
    this.name = 'AiError';
  }
}

export interface AiRobotInfo {
  id: string;
  name: string;
  personality?: string;
  keywords?: string[];
  /** 命中的关键词，用于生成更贴合内容的回复 */
  matchedKeyword?: string;
}

export interface AiChatOptions {
  message: string;
  /** 机器人角色信息，个人对话时传通用助手 */
  robot?: AiRobotInfo;
  /** 对话历史（个人对话多轮上下文） */
  history?: { role: string; content: string }[];
}

@Provide()
export class AiService {
  @Config('ai')
  aiConfig: {
    provider: '' | 'http' | 'algochat';
    apiUrl: string;
    model: string;
    timeout: number;
    maxRetries: number;
    retryDelay: number;
  };

  @Logger()
  logger: ILogger;

  /**
   * 获取 AI 回复。
   * 内置重试机制：失败后按 retryDelay 递增间隔重试 maxRetries 次，
   * 全部失败后抛出 AiError，由上层决定如何标记回复位置。
   */
  async chat(options: AiChatOptions): Promise<string> {
    let lastError: Error;
    for (let attempt = 0; attempt <= this.aiConfig.maxRetries; attempt++) {
      try {
        if (this.aiConfig.provider === 'algochat') {
          return await this.requestAlgoChat(options);
        }
        if (this.aiConfig.apiUrl) {
          return await this.requestExternal(options);
        }
        return this.simulate(options);
      } catch (err) {
        lastError = err;
        if (attempt < this.aiConfig.maxRetries) {
          const delay = this.aiConfig.retryDelay * (attempt + 1);
          this.logger.warn(
            `[ai] 第${attempt + 1}次调用失败：${err.message}，${delay}ms 后重试`
          );
          await sleep(delay);
        }
      }
    }
    this.logger.error(
      `[ai] 重试 ${this.aiConfig.maxRetries} 次后仍失败：${lastError.message}`
    );
    if (lastError instanceof AiError) {
      throw lastError;
    }
    throw new AiError(lastError.message);
  }

  /** 调用 algochat.app（免费、无需 API Key），复用 OpenAI 风格消息结构 */
  private async requestAlgoChat(options: AiChatOptions): Promise<string> {
    try {
      const messages: {
        role: 'system' | 'user' | 'assistant';
        content: string;
      }[] = [];
      if (options.robot) {
        const parts = [`你是一个智能聊天助手，名字叫「${options.robot.name}」`];
        if (options.robot.personality) {
          parts.push(`性格定位：${options.robot.personality}`);
        }
        if (options.robot.keywords && options.robot.keywords.length > 0) {
          parts.push(`你擅长的话题：${options.robot.keywords.join('、')}`);
        }
        parts.push('请用自然简洁的中文回复。');
        messages.push({ role: 'system', content: parts.join('，') });
      }
      for (const h of options.history || []) {
        messages.push({
          role:
            h.role === 'assistant'
              ? 'assistant'
              : h.role === 'system'
                ? 'system'
                : 'user',
          content: h.content,
        });
      }
      messages.push({ role: 'user', content: options.message });

      return await algochatChat(messages, {
        model: this.aiConfig.model,
        timeout: this.aiConfig.timeout,
      });
    } catch (err) {
      throw new AiError(`algochat 调用失败：${err.message}`);
    }
  }

  /** 调用外部 AI HTTP API（带超时控制） */
  private async requestExternal(options: AiChatOptions): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.aiConfig.timeout);
    try {
      const res = await fetch(this.aiConfig.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: options.message,
          robot: options.robot,
          history: options.history || [],
        }),
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new AiError(`外部AI接口返回异常状态码 HTTP ${res.status}`);
      }
      const data: any = await res.json();
      const reply =
        data?.reply ||
        data?.choices?.[0]?.message?.content ||
        data?.content ||
        (typeof data === 'string' ? data : '');
      if (!reply) {
        throw new AiError('外部AI接口返回格式无法解析');
      }
      return reply;
    } catch (err) {
      if (err instanceof AiError) {
        throw err;
      }
      if (err.name === 'AbortError') {
        throw new AiError(`外部AI接口请求超时(${this.aiConfig.timeout}ms)`);
      }
      throw new AiError(`外部AI接口请求失败：${err.message}`);
    } finally {
      clearTimeout(timer);
    }
  }

  /** 内置模拟回复（无需外部 API 时的兜底实现） */
  private simulate(options: AiChatOptions): string {
    const { message, robot } = options;
    const seed = this.hashCode(`${robot?.id || 'assistant'}:${message}`);

    if (!robot || !robot.personality) {
      const templates = [
        `关于「${message}」，我建议先梳理清楚目标和约束，再逐步拆解执行。`,
        `收到！「${message}」这个话题我们可以从背景、方案和风险三个角度来分析。`,
        `对于「${message}」，我的理解是…… 简单来说，先聚焦最关键的问题点。`,
      ];
      return templates[seed % templates.length];
    }

    const matched = robot.matchedKeyword;
    if (matched) {
      const templates = [
        `我是${robot.name}（${robot.personality}）。你提到了「${matched}」，针对「${message}」，我认为……`,
        `${robot.name}收到：关于「${message}」中涉及「${matched}」的部分，我的回复是……`,
        `（${robot.name}）看到你聊到「${matched}」，结合「${message}」，我的看法如下……`,
      ];
      return templates[seed % templates.length];
    }

    const templates = [
      `我是${robot.name}（${robot.personality}）。收到你的消息「${message}」，我的回应是……`,
      `${robot.name}在线：关于「${message}」，我这边给出如下建议……`,
      `（${robot.name}）已收到「${message}」，让我来想想怎么回应你。`,
    ];
    return templates[seed % templates.length];
  }

  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }
}
