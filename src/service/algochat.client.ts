import axios from 'axios';

/**
 * AlgoChat 适配客户端
 *
 * 上游 algochat-ai@1.0.0 包依赖的会话接口已变更（旧 cookie 名 zola_sid/csrf_token
 * 已废弃），直接调用会返回 401 Missing session id。本文件按当前 algochat.app
 * 的实际接口（algochat_session/algochat_user cookie + sessionId）重新实现，
 * 对外提供与该包一致的 Message / ChatOptions 契约。
 */

export interface AlgoChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AlgoChatOptions {
  model?: string;
  systemPrompt?: string;
  timeout?: number;
}

export const ALGOCHAT_BASE = 'https://algochat.app';
export const DEFAULT_MODEL = 'gemini-3-flash-preview';
const SESSION_TTL_MS = 25 * 60 * 1000;
const UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function randomId(length = 16): string {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from(
    { length },
    () => chars[Math.floor(Math.random() * chars.length)]
  ).join('');
}

function parseCookies(setCookies: string[]): Record<string, string> {
  const cookies: Record<string, string> = {};
  for (const cookie of setCookies) {
    const [nameValue] = cookie.split(';');
    const idx = nameValue.indexOf('=');
    if (idx === -1) continue;
    cookies[nameValue.slice(0, idx).trim()] = nameValue.slice(idx + 1).trim();
  }
  return cookies;
}

function buildCookieHeader(cookies: Record<string, string>): string {
  return Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
}

interface Session {
  cookies: Record<string, string>;
  fetchedAt: number;
}

class AlgoChatClient {
  private session: Session | null = null;

  private async fetchSession(): Promise<Record<string, string>> {
    let cookies: Record<string, string> = {};
    try {
      // /api/csrf 已在部分环境下返回 401，不再影响会话建立，容错跳过
      const csrfRes = await axios.get(`${ALGOCHAT_BASE}/api/csrf`, {
        headers: {
          'User-Agent': UA,
          Accept: 'application/json, */*',
          Referer: ALGOCHAT_BASE,
        },
      });
      cookies = parseCookies(csrfRes.headers['set-cookie'] || []);
    } catch {
      // ignore：csrf 失败不代表会话不可用
    }

    const sessionRes = await axios.post(
      `${ALGOCHAT_BASE}/api/session`,
      {},
      {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': UA,
          Cookie: buildCookieHeader(cookies),
          Origin: ALGOCHAT_BASE,
          Referer: ALGOCHAT_BASE,
        },
      }
    );
    // 当前接口通过 set-cookie 下发会话：algochat_session / algochat_user
    cookies = {
      ...cookies,
      ...parseCookies(sessionRes.headers['set-cookie'] || []),
    };
    if (!cookies['algochat_session']) {
      throw new Error('获取 algochat 会话失败：缺少 algochat_session cookie');
    }
    return cookies;
  }

  private async getSession(): Promise<Record<string, string>> {
    const now = Date.now();
    if (!this.session || now - this.session.fetchedAt > SESSION_TTL_MS) {
      const cookies = await this.fetchSession();
      this.session = { cookies, fetchedAt: now };
    }
    return this.session.cookies;
  }

  private invalidateSession(): void {
    this.session = null;
  }

  private async createChat(
    cookies: Record<string, string>,
    model: string
  ): Promise<string> {
    const res = await axios.post(
      `${ALGOCHAT_BASE}/api/create-chat`,
      { title: 'New Chat', model },
      {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': UA,
          Cookie: buildCookieHeader(cookies),
          Origin: ALGOCHAT_BASE,
          Referer: ALGOCHAT_BASE,
        },
      }
    );
    const chatId = res.data?.chat?.id || res.data?.id;
    if (!chatId) throw new Error('create-chat 未返回 chatId');
    return chatId;
  }

  private convertMessages(messages: AlgoChatMessage[]) {
    return messages.map(m => ({
      id: randomId(8),
      role: m.role === 'assistant' ? 'assistant' : 'user',
      parts: [
        {
          type: 'text',
          text: typeof m.content === 'string' ? m.content : String(m.content),
        },
      ],
    }));
  }

  private async requestChat(
    cookies: Record<string, string>,
    chatId: string,
    messages: AlgoChatMessage[],
    model: string,
    systemPrompt: string,
    timeout: number
  ) {
    const requestBody = {
      chatId,
      userId: cookies['algochat_session'],
      model,
      isAuthenticated: false,
      systemPrompt,
      enableSearch: false,
      id: randomId(16),
      messages: this.convertMessages(messages),
      trigger: 'submit-message',
    };
    return axios.post(`${ALGOCHAT_BASE}/api/chat`, requestBody, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': UA,
        Cookie: buildCookieHeader(cookies),
        Origin: ALGOCHAT_BASE,
        Referer: `${ALGOCHAT_BASE}/c/${chatId}`,
        'x-vercel-ai-ui-message-stream': 'v1',
        Accept: 'text/event-stream',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
      },
      responseType: 'stream',
      timeout,
    });
  }

  private streamToText(stream: NodeJS.ReadableStream): Promise<string> {
    return new Promise((resolve, reject) => {
      let fullText = '';
      let buffer = '';
      stream.on('data', (chunk: Buffer) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop();
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const jsonStr = trimmed.slice(5).trim();
          if (!jsonStr || jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.type === 'text-delta' && parsed.delta)
              fullText += parsed.delta;
          } catch {
            // 跳过解析失败的块
          }
        }
      });
      stream.on('end', () => resolve(fullText));
      stream.on('error', reject);
    });
  }

  async chat(
    messages: AlgoChatMessage[],
    options: AlgoChatOptions = {}
  ): Promise<string> {
    const model = options.model || DEFAULT_MODEL;
    const systemPrompt: string =
      options.systemPrompt ||
      `Date: ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
You are a helpful AI assistant. Respond clearly and concisely. Use markdown formatting when appropriate.`;
    const timeout = options.timeout || 90000;

    const userMessages = messages.filter(m => m.role !== 'system');

    const cookies = await this.getSession();
    const attempt = async (c: Record<string, string>) => {
      let chatId: string;
      try {
        chatId = await this.createChat(c, model);
      } catch (err) {
        if (err.response?.status === 401 || err.response?.status === 403) {
          this.invalidateSession();
          c = await this.getSession();
          chatId = await this.createChat(c, model);
        } else {
          throw err;
        }
      }
      const res = await this.requestChat(
        c,
        chatId,
        userMessages,
        model,
        systemPrompt,
        timeout
      );
      return this.streamToText(res.data);
    };

    try {
      return await attempt(cookies);
    } catch (err) {
      const status = err.response?.status;
      if (status === 401 || status === 403) {
        this.invalidateSession();
        return await attempt(await this.getSession());
      }
      throw err;
    }
  }
}

export const algochat = new AlgoChatClient();

/** 与 algochat-ai 包一致的便捷调用 */
export function chat(
  input: string | AlgoChatMessage[],
  options: AlgoChatOptions = {}
): Promise<string> {
  const messages: AlgoChatMessage[] =
    typeof input === 'string' ? [{ role: 'user', content: input }] : input;
  return algochat.chat(messages, options);
}
