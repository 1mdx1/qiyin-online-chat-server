export enum ErrorCode {
  Success = 200,
  /** 参数校验失败 */
  ParamsValidateFailed = 300,
  /** 权限校验失败 */
  UnauthorizedError = 301,
  /** 未知错误 */
  Notfound = 400,
  /** 未知错误 */
  Unknown = 500,

  /** 用户已存在 */
  UserAlreadyExist = 1001,
  /** 用户不存在 */
  UserNotExist = 1002,
  /** 密码错误 */
  PasswordError = 1003,

  /** 对话不存在 */
  ConversationNotExist = 2001,

  /** 群组不存在 */
  GroupNotExist = 3001,
  /** 不是群组成员 */
  GroupNotMember = 3002,
  /** 无群组操作权限（仅创建者可操作） */
  GroupNoPermission = 3003,
  /** 机器人不存在 */
  RobotNotExist = 3004,
  /** 成员不存在 */
  MemberNotExist = 3005,

  /** AI 调用失败（重试后仍失败） */
  AiCallFailed = 4001,
}

export const ErrorMessage: Record<ErrorCode, string> = {
  [ErrorCode.Success]: '成功',
  [ErrorCode.UnauthorizedError]: '认证失败',
  [ErrorCode.ParamsValidateFailed]: '参数校验失败',
  [ErrorCode.Unknown]: '未知错误',
  [ErrorCode.Notfound]: '未知请求',
  [ErrorCode.PasswordError]: '密码错误',
  [ErrorCode.UserNotExist]: '用户不存在',
  [ErrorCode.UserAlreadyExist]: '用户已存在',
  [ErrorCode.ConversationNotExist]: '对话不存在',
  [ErrorCode.GroupNotExist]: '群组不存在',
  [ErrorCode.GroupNotMember]: '您不是该群组成员',
  [ErrorCode.GroupNoPermission]: '无操作权限，仅群组创建者可操作',
  [ErrorCode.RobotNotExist]: '机器人不存在',
  [ErrorCode.MemberNotExist]: '成员不存在',
  [ErrorCode.AiCallFailed]: 'AI 服务暂时不可用',
};

export class CustomError extends Error {
  code: number;
  message: string;
  constructor(code: number, message = ErrorMessage[code]) {
    super();
    this.code = code;
    this.message = message;
  }
}
