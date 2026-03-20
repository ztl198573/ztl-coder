/**
 * 统一错误处理模块
 *
 * 提供标准化的错误类型、错误创建工厂和错误恢复机制
 */

/** 错误代码枚举 */
export type ErrorCode =
  // 通用错误
  | "UNKNOWN_ERROR"
  | "INVALID_INPUT"
  | "OPERATION_FAILED"
  | "TIMEOUT"
  | "PERMISSION_DENIED"
  // 文件系统错误
  | "FILE_NOT_FOUND"
  | "FILE_READ_ERROR"
  | "FILE_WRITE_ERROR"
  | "DIRECTORY_NOT_FOUND"
  // Git 错误
  | "GIT_NOT_INITIALIZED"
  | "GIT_CONFLICT"
  | "GIT_MERGE_FAILED"
  | "GIT_REBASE_FAILED"
  | "GIT_PUSH_FAILED"
  | "GIT_PULL_FAILED"
  // 工作流错误
  | "WORKFLOW_NOT_FOUND"
  | "WORKFLOW_EXECUTION_FAILED"
  | "TASK_DEPENDENCY_ERROR"
  | "TASK_TIMEOUT"
  | "TASK_RETRY_EXHAUSTED"
  // 计划错误
  | "PLAN_NOT_FOUND"
  | "PLAN_VERSION_NOT_FOUND"
  | "PLAN_INVALID_STATE"
  // PTY 错误
  | "PTY_SESSION_NOT_FOUND"
  | "PTY_SESSION_FAILED"
  | "PTY_MAX_SESSIONS_REACHED"
  // 解析错误
  | "PARSE_ERROR"
  | "INVALID_SYNTAX"
  | "SCHEMA_VALIDATION_ERROR";

/** 错误严重程度 */
export type ErrorSeverity = "low" | "medium" | "high" | "critical";

/** 错误类别 */
export type ErrorCategory =
  | "system"
  | "user"
  | "network"
  | "filesystem"
  | "git"
  | "workflow"
  | "plan"
  | "pty"
  | "parse";

/** 错误元数据 */
export interface ErrorMetadata {
  /** 错误代码 */
  code: ErrorCode;
  /** 错误类别 */
  category: ErrorCategory;
  /** 严重程度 */
  severity: ErrorSeverity;
  /** 是否可恢复 */
  recoverable: boolean;
  /** 建议的恢复操作 */
  recoveryHint?: string;
  /** 相关文件路径 */
  filePath?: string;
  /** 相关行号 */
  line?: number;
  /** 相关列号 */
  column?: number;
  /** 原始错误 */
  cause?: Error;
  /** 附加上下文 */
  context?: Record<string, unknown>;
  /** 时间戳 */
  timestamp: Date;
}

/** 应用错误类 */
export class AppError extends Error {
  readonly metadata: ErrorMetadata;

  constructor(message: string, metadata: Partial<ErrorMetadata>) {
    super(message);
    this.name = "AppError";
    this.metadata = {
      code: metadata.code || "UNKNOWN_ERROR",
      category: metadata.category || "system",
      severity: metadata.severity || "medium",
      recoverable: metadata.recoverable ?? true,
      timestamp: new Date(),
      ...metadata,
    };

    // 保持正确的原型链
    Object.setPrototypeOf(this, AppError.prototype);
  }

  /** 获取格式化的错误信息 */
  getFormattedMessage(): string {
    const parts = [`[${this.metadata.code}]`, this.message];

    if (this.metadata.filePath) {
      parts.push(`文件: ${this.metadata.filePath}`);
      if (this.metadata.line) {
        parts.push(`行: ${this.metadata.line}`);
      }
    }

    if (this.metadata.recoveryHint) {
      parts.push(`建议: ${this.metadata.recoveryHint}`);
    }

    return parts.join("\n");
  }

  /** 转换为 JSON */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      metadata: this.metadata,
      stack: this.stack,
    };
  }
}

/** 错误工厂 */
export const Errors = {
  /** 创建通用错误 */
  unknown(message: string, cause?: Error): AppError {
    return new AppError(message, {
      code: "UNKNOWN_ERROR",
      category: "system",
      severity: "medium",
      recoverable: true,
      cause,
    });
  },

  /** 创建输入验证错误 */
  invalidInput(message: string, context?: Record<string, unknown>): AppError {
    return new AppError(message, {
      code: "INVALID_INPUT",
      category: "user",
      severity: "low",
      recoverable: true,
      recoveryHint: "请检查输入参数是否符合要求",
      context,
    });
  },

  /** 创建文件未找到错误 */
  fileNotFound(filePath: string): AppError {
    return new AppError(`文件不存在: ${filePath}`, {
      code: "FILE_NOT_FOUND",
      category: "filesystem",
      severity: "medium",
      recoverable: true,
      filePath,
      recoveryHint: "请确认文件路径是否正确",
    });
  },

  /** 创建文件读取错误 */
  fileReadError(filePath: string, cause?: Error): AppError {
    return new AppError(`读取文件失败: ${filePath}`, {
      code: "FILE_READ_ERROR",
      category: "filesystem",
      severity: "medium",
      recoverable: true,
      filePath,
      cause,
      recoveryHint: "请检查文件权限或文件是否损坏",
    });
  },

  /** 创建文件写入错误 */
  fileWriteError(filePath: string, cause?: Error): AppError {
    return new AppError(`写入文件失败: ${filePath}`, {
      code: "FILE_WRITE_ERROR",
      category: "filesystem",
      severity: "medium",
      recoverable: true,
      filePath,
      cause,
      recoveryHint: "请检查文件权限或磁盘空间",
    });
  },

  /** 创建 Git 冲突错误 */
  gitConflict(files: string[]): AppError {
    return new AppError(`存在 Git 冲突: ${files.join(", ")}`, {
      code: "GIT_CONFLICT",
      category: "git",
      severity: "high",
      recoverable: true,
      context: { files },
      recoveryHint: "请手动解决冲突后继续操作",
    });
  },

  /** 创建工作流执行错误 */
  workflowExecutionFailed(workflowId: string, cause?: Error): AppError {
    return new AppError(`工作流执行失败: ${workflowId}`, {
      code: "WORKFLOW_EXECUTION_FAILED",
      category: "workflow",
      severity: "high",
      recoverable: true,
      cause,
      context: { workflowId },
      recoveryHint: "请检查工作流配置或重试",
    });
  },

  /** 创建任务依赖错误 */
  taskDependencyError(taskId: string, missingDeps: string[]): AppError {
    return new AppError(
      `任务依赖未满足: ${taskId} 依赖 ${missingDeps.join(", ")}`,
      {
        code: "TASK_DEPENDENCY_ERROR",
        category: "workflow",
        severity: "high",
        recoverable: true,
        context: { taskId, missingDeps },
        recoveryHint: "请确保依赖的任务已完成",
      },
    );
  },

  /** 创建超时错误 */
  timeout(operation: string, timeoutMs: number): AppError {
    return new AppError(`操作超时: ${operation} (${timeoutMs}ms)`, {
      code: "TIMEOUT",
      category: "system",
      severity: "medium",
      recoverable: true,
      context: { operation, timeoutMs },
      recoveryHint: "请增加超时时间或检查系统资源",
    });
  },

  /** 创建计划未找到错误 */
  planNotFound(planId?: string): AppError {
    return new AppError(`计划不存在${planId ? `: ${planId}` : ""}`, {
      code: "PLAN_NOT_FOUND",
      category: "plan",
      severity: "medium",
      recoverable: true,
      context: { planId },
      recoveryHint: "请先创建计划",
    });
  },

  /** 创建 PTY 会话错误 */
  ptySessionNotFound(sessionId: string): AppError {
    return new AppError(`PTY 会话不存在: ${sessionId}`, {
      code: "PTY_SESSION_NOT_FOUND",
      category: "pty",
      severity: "medium",
      recoverable: true,
      context: { sessionId },
      recoveryHint: "请确认会话 ID 是否正确",
    });
  },

  /** 创建解析错误 */
  parseError(message: string, filePath?: string, line?: number, column?: number): AppError {
    return new AppError(message, {
      code: "PARSE_ERROR",
      category: "parse",
      severity: "medium",
      recoverable: true,
      filePath,
      line,
      column,
      recoveryHint: "请检查语法是否正确",
    });
  },
};

/** 错误处理结果 */
export interface ErrorResult<T> {
  success: boolean;
  data?: T;
  error?: AppError;
}

/** 安全执行函数 */
export async function safeExecute<T>(
  fn: () => Promise<T>,
  errorHandler?: (error: Error) => AppError,
): Promise<ErrorResult<T>> {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (err) {
    const error =
      err instanceof AppError
        ? err
        : errorHandler
          ? errorHandler(err instanceof Error ? err : new Error(String(err)))
          : Errors.unknown(
              err instanceof Error ? err.message : String(err),
              err instanceof Error ? err : undefined,
            );
    return { success: false, error };
  }
}

/** 同步安全执行函数 */
export function safeExecuteSync<T>(
  fn: () => T,
  errorHandler?: (error: Error) => AppError,
): ErrorResult<T> {
  try {
    const data = fn();
    return { success: true, data };
  } catch (err) {
    const error =
      err instanceof AppError
        ? err
        : errorHandler
          ? errorHandler(err instanceof Error ? err : new Error(String(err)))
          : Errors.unknown(
              err instanceof Error ? err.message : String(err),
              err instanceof Error ? err : undefined,
            );
    return { success: false, error };
  }
}

/** 从未知错误中提取错误信息（兼容旧 API） */
export function extractErrorMessage(err: unknown): string {
  if (err instanceof AppError) {
    return err.message;
  }
  if (err instanceof Error) {
    return err.message;
  }
  if (typeof err === "string") {
    return err;
  }
  return "未知错误";
}

/** 检查是否为文件不存在错误 */
export function isFileNotFoundError(error: unknown): boolean {
  if (error instanceof AppError) {
    return error.metadata.code === "FILE_NOT_FOUND";
  }
  if (error instanceof Error) {
    const nodeError = error as NodeJS.ErrnoException;
    return nodeError.code === "ENOENT";
  }
  return false;
}

/** 检查是否为权限错误 */
export function isPermissionError(error: unknown): boolean {
  if (error instanceof AppError) {
    return error.metadata.code === "PERMISSION_DENIED";
  }
  if (error instanceof Error) {
    const nodeError = error as NodeJS.ErrnoException;
    return nodeError.code === "EACCES" || nodeError.code === "EPERM";
  }
  return false;
}

/** 判断是否为可恢复错误 */
export function isRecoverable(err: unknown): boolean {
  if (err instanceof AppError) {
    return err.metadata.recoverable;
  }
  return true;
}

/** 创建带上下文的错误 */
export function createContextualError(
  context: string,
  error: unknown,
): Error {
  const message = extractErrorMessage(error);
  return new Error(`${context}: ${message}`);
}

/** 错误重试配置 */
export interface RetryConfig {
  /** 最大重试次数 */
  maxRetries: number;
  /** 初始延迟（毫秒） */
  initialDelay: number;
  /** 最大延迟（毫秒） */
  maxDelay: number;
  /** 退避因子 */
  backoffFactor: number;
  /** 可重试的错误代码 */
  retryableCodes?: ErrorCode[];
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 100,
  maxDelay: 5000,
  backoffFactor: 2,
};

/** 带重试的执行函数 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {},
): Promise<T> {
  const cfg = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error | undefined;
  let delay = cfg.initialDelay;

  for (let attempt = 0; attempt <= cfg.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      // 检查是否可重试
      if (err instanceof AppError) {
        if (!err.metadata.recoverable) {
          throw err;
        }
        if (cfg.retryableCodes && !cfg.retryableCodes.includes(err.metadata.code)) {
          throw err;
        }
      }

      // 最后一次尝试不再等待
      if (attempt < cfg.maxRetries) {
        await new Promise((resolve) => {
          const start = Date.now();
          const check = () => {
            if (Date.now() - start >= delay) {
              resolve(undefined);
            } else {
              setImmediate(check);
            }
          };
          setImmediate(check);
        });
        delay = Math.min(delay * cfg.backoffFactor, cfg.maxDelay);
      }
    }
  }

  throw lastError;
}
