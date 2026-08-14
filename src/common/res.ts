import { ErrorCode, ErrorMessage, CustomError } from './error';

export function success<T>(data: T) {
  return {
    code: ErrorCode.Success,
    message: ErrorMessage[ErrorCode.Success],
    data,
  };
}

/**
 * @param error
 * @returns
 */
export function failed(error: CustomError) {
  return {
    code: error.code,
    message: error.message,
  };
}
