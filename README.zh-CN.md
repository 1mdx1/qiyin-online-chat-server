# Qiyin Chat · 服务端

Qiyin Chat 的后端服务（online-chat / server）。基于 [Midway 4.x](https://midwayjs.org) 的 TypeScript 全栈应用，提供用户认证、个人 AI 对话、多机器人群聊与基于 Socket.IO 的实时长连接能力。

- 启动后 HTTP 服务与 Socket.IO 服务均监听 `7001` 端口（开发环境）。
- 内置 Swagger UI：`http://localhost:7001/swagger-ui`。

## 技术栈

| 类别 | 选型 |
| --- | --- |
| 框架 | Midway 4.x（Koa） |
| 语言 | TypeScript（Node >= 20） |
| 数据库 | PostgreSQL（TypeORM，`synchronize: false`，使用迁移脚本建表） |
| 缓存 | Redis（标签索引、机器人回复防循环计数） |
| 认证 | JWT（`@midwayjs/jwt`，8 小时过期） |
| 实时通信 | Socket.IO（`@midwayjs/socketio`，命名空间 `/group`） |
| AI | 可插拔：`algochat` / 自定义 `http` / 内置模拟（provider 为空） |
| 校验 | Joi（`@midwayjs/validation-joi`） |
| 测试 | Jest + `@midwayjs/mock` |

## 功能特性

- **用户体系**：注册、登录，JWT 鉴权（`/user/*` 免鉴权，其余接口需携带 `Authorization: Bearer <token>`）。
- **个人对话**：多轮 AI 问答（携带历史上下文）、标签分类与筛选、对话重命名/删除。
- **群组对话**：多个机器人协作回复，支持回复策略（`content` 内容匹配 / `random` 随机 / `all` 全部回复）；按账号名邀请人类成员（**免确认直接入群**）；成员添加/移除；群组重命名/解散。
- **实时长连接**：群组消息经 Socket.IO 房间广播；被邀请者在线时服务端即时通知并自动加入房间，离线者在建立连接时自动加入其所在群组房间。
- **AI 容错**：内置重试机制，全部失败后标记回复位置（`status=1`）并返回保底文案；群聊防循环（机器人不触发机器人 + Redis 连续回复计数上限）。
- **机器人预设**：服务启动时自动初始化「AI助手 / 客服机器人 / 技术机器人 / 幽默机器人」。

## 目录结构

```
src/
├── configuration.ts        # 应用装配（组件、中间件、过滤器、机器人种子数据）
├── config/
│   ├── config.default.ts   # 默认配置（端口、数据库、Redis、JWT、AI）
│   ├── config.dev.ts       # 开发环境配置
│   └── config.unittest.ts  # 单元测试配置（socket 39001、AI 走内置模拟）
├── controller/             # HTTP 控制器（user / robot / conversation / group）
├── service/                # 业务逻辑（ai / robot / message / group / groupSocketRelay）
├── socket/                 # Socket.IO 网关（/group）
├── entity/                 # TypeORM 实体（user / conversation / group / message）
├── dto/                    # 请求/响应 DTO（含 Swagger 注解）
├── middleware/             # JWT 鉴权、统一响应包装
├── common/                 # 错误码、Redis Key
└── migration/              # 数据库迁移脚本
```

## 快速开始

### 环境依赖

- Node.js >= 20
- PostgreSQL（默认 `127.0.0.1:5432`）
- Redis（默认 `127.0.0.1:6379`）

### 1. 准备数据库

```bash
# 创建数据库（示例）
createdb -U postgres qiyin
```

### 2. 安装依赖

```bash
npm install
```

### 3. 执行数据库迁移

应用默认 `synchronize: false`，需要先运行迁移脚本建表：

```bash
# 使用默认配置（config.default.ts）
npm run migration:run-default

# 或指定配置文件
npm run migration:run ./src/config/config.dev.ts
```

迁移包含：`user`、`conversation`、`group`、`message`、`ai-chat`、`group-name`。

### 4. 启动开发服务

```bash
npm run dev
# HTTP + Socket.IO：http://localhost:7001/
# Swagger UI：http://localhost:7001/swagger-ui
```

## 配置说明（`src/config/config.default.ts`）

| 配置项 | 说明 | 默认值 |
| --- | --- | --- |
| `koa.port` | HTTP 端口 | `7001` |
| `typeorm` | PostgreSQL 连接（host/port/user/password/database） | `127.0.0.1:5432` / `qiyin` |
| `redis` | Redis 连接 | `127.0.0.1:6379` db `0` |
| `jwt.secret` | JWT 签名密钥（生产环境请替换） | 示例值 |
| `jwt.sign.expiresIn` | Token 有效期 | `8h` |
| `ai.provider` | AI 提供方：`''`（内置模拟）\| `'http'`（自定义 `apiUrl`）\| `'algochat'` | `algochat` |
| `ai.model` | 模型名称 | `gemini-3-flash-preview` |
| `ai.timeout` / `ai.maxRetries` / `ai.retryDelay` | 调用超时 / 最大重试 / 重试间隔 | `60000` / `2` / `500` |

## API 一览

> 除 `POST /user/*` 外，所有接口均需携带请求头 `Authorization: Bearer <token>`。
> 统一响应信封：`{ code, message, data }`，`code === 200` 表示成功。

### 用户（/user）

| 接口 | 说明 |
| --- | --- |
| `POST /user/register` | 注册 `{ name, password }` |
| `POST /user/login` | 登录 `{ email, password }` → `{ token, user: { uid, name } }` |

### 机器人（/robot）

| 接口 | 说明 |
| --- | --- |
| `POST /robot/list` | 机器人列表 → `{ list: [{ id, name, personality }] }` |

### 个人对话（/conversation）

| 接口 | 说明 |
| --- | --- |
| `POST /conversation/create` | 创建会话并落库首条消息（`message` 作为标题）→ `{ conversation, userMessage, reply }` |
| `POST /conversation/list` | 会话列表，可按 `tags` 筛选 → `{ list }` |
| `POST /conversation/send` | 发送消息（携带历史调用 AI）→ `{ userMessage, reply }` |
| `POST /conversation/message-list` | 分页拉取消息 `{ id, page?, pageSize? }` → `{ list, total, page, pageSize }` |
| `POST /conversation/update-name` | 重命名 → 返回会话 |
| `POST /conversation/update-tags` | 更新标签 → 返回会话 |
| `POST /conversation/delete` | 删除会话及其消息 |

### 群组对话（/group）

| 接口 | 说明 |
| --- | --- |
| `POST /group/create` | 创建群组 `{ name, robotIds[] }` → 群组详情 |
| `POST /group/list` | 我的群组列表 → `{ list }` |
| `POST /group/detail` | 群组详情（成员、创建人） |
| `POST /group/update-name` | 修改群名（仅创建者） |
| `POST /group/update-strategy` | 更新回复策略 `{ strategy, maxRobotReplies? }`（仅创建者） |
| `POST /group/add-member` | 添加成员 `{ memberIds[] }`（仅创建者） |
| `POST /group/remove-member` | 移除成员（仅创建者，不可移除创建者本人） |
| `POST /group/invite` | 按账号名邀请人类用户（免确认直入，仅创建者） |
| `POST /group/delete` | 解散群组（仅创建者） |
| `POST /group/message-list` | 分页拉取群消息 |

### Socket.IO 实时通信（命名空间 `/group`）

连接时通过 handshake 携带 JWT（`auth.token` 或 `Authorization` 头），认证通过后：

- 服务端**自动**将用户加入其所在全部群组房间（无需手动 `join`）。
- 客户端 → 服务端事件：`join`、`leave`、`chat`。
- 服务端 → 客户端事件：`joined`、`message`（房间广播）、`error`、`invited`（被邀请时刷新群列表）。
- 在线被邀请者由服务端即时 `join` 房间并推送 `invited`；离线者连接时自动入房兜底。

## 消息与成员字段约定

- 消息（`MessageDto`）：`id, gid, cid, uid, senderName, senderType, status, message, createdAt`
  - `senderType`：`1` = 人类，`2` = 机器人
  - `status`：`0` = 正常，`1` = AI 回复失败（重试后仍失败）
- 群组成员：`id, name, type(1=人类 2=机器人), personality`

## 错误码

| code | 含义 |
| --- | --- |
| `200` | 成功 |
| `300` | 参数校验失败 |
| `301` | 认证失败（未登录 / token 无效） |
| `400` | 未知请求 |
| `500` | 未知错误 |
| `1001` | 用户已存在 |
| `1002` | 用户不存在 |
| `1003` | 密码错误 |
| `2001` | 对话不存在 |
| `3001` | 群组不存在 |
| `3002` | 不是群组成员 |
| `3003` | 无操作权限（仅群组创建者可操作） |
| `3004` | 机器人不存在 |
| `3005` | 成员不存在 |
| `4001` | AI 服务暂时不可用 |

## 测试

```bash
# 运行全部测试（5 个套件 / 32 个用例）
npm test

# 单独运行某个文件
npx jest --runInBand test/controller/group.test.ts --forceExit

# 覆盖率
npm run cov
```

测试基于 `config.unittest.ts`：Socket.IO 使用 `39001` 端口、AI 走内置模拟（`provider: ''`），避免依赖外部服务，保证结果确定性。

## 常用脚本

```bash
npm run dev                 # 开发（watch + 热重启）
npm run build               # 编译（mwtsc）
npm run start               # 生产启动
npm run lint / lint:fix     # 代码风格检查 / 自动修复
npm test                    # 单元与集成测试
npm run cov                 # 测试覆盖率
npm run entity:create       # 生成实体模板
npm run migration:create    # 生成迁移文件
npm run migration:run       # 执行迁移（指定配置）
npm run migration:run-default  # 执行迁移（默认配置）
```

## 部署

```bash
npm run build
NODE_ENV=production npm start
```
