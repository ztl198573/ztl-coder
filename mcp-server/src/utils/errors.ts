/**
 * 错误处理工具
 * 提供统一的错误提取和处理
 */

/** 从未知错误提取错误消息 */
export function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return String(error);
}

/** 检查是否为文件不存在错误 */
export function isFileNotFoundError(error: unknown): boolean {
  if (error instanceof Error) {
    const nodeError = error as NodeJS.ErrnoException;
    return nodeError.code === "ENOENT";
  }
  return false;
}

/** 检查是否为权限错误 */
export function isPermissionError(error: unknown): boolean {
  if (error instanceof Error) {
    const nodeError = error as NodeJS.ErrnoException;
    return nodeError.code === "EACCES" || nodeError.code === "EPERM";
  }
  return false;
}

/** 创建带上下文的错误 */
export function createContextualError(
  context: string,
  error: unknown,
): Error {
  const message = extractErrorMessage(error);
  return new Error(`${context}: ${message}`);
}
