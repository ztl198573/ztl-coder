/**
 * 结构化日志工具
 * 提供统一的日志记录接口
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  module: string;
  message: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

/** 日志级别优先级 */
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/** 当前日志级别 (从环境变量读取) */
const currentLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || "info";

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

function formatEntry(entry: LogEntry): string {
  const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.module}]`;
  if (entry.data) {
    return `${prefix} ${entry.message} ${JSON.stringify(entry.data)}`;
  }
  return `${prefix} ${entry.message}`;
}

function createLogger(module: string) {
  return {
    debug: (message: string, data?: Record<string, unknown>): void => {
      if (shouldLog("debug")) {
        const entry: LogEntry = {
          level: "debug",
          module,
          message,
          timestamp: new Date().toISOString(),
          data,
        };
        console.error(formatEntry(entry));
      }
    },

    info: (message: string, data?: Record<string, unknown>): void => {
      if (shouldLog("info")) {
        const entry: LogEntry = {
          level: "info",
          module,
          message,
          timestamp: new Date().toISOString(),
          data,
        };
        console.error(formatEntry(entry));
      }
    },

    warn: (message: string, data?: Record<string, unknown>): void => {
      if (shouldLog("warn")) {
        const entry: LogEntry = {
          level: "warn",
          module,
          message,
          timestamp: new Date().toISOString(),
          data,
        };
        console.error(formatEntry(entry));
      }
    },

    error: (message: string, error?: unknown): void => {
      if (shouldLog("error")) {
        const entry: LogEntry = {
          level: "error",
          module,
          message,
          timestamp: new Date().toISOString(),
          data: error ? { error: extractErrorMessage(error) } : undefined,
        };
        console.error(formatEntry(entry));
      }
    },
  };
}

/** 从错误对象提取消息 */
function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return String(error);
}

/** 创建日志器 */
export const log = {
  debug: (module: string, message: string, data?: Record<string, unknown>) =>
    createLogger(module).debug(message, data),
  info: (module: string, message: string, data?: Record<string, unknown>) =>
    createLogger(module).info(message, data),
  warn: (module: string, message: string, data?: Record<string, unknown>) =>
    createLogger(module).warn(message, data),
  error: (module: string, message: string, error?: unknown) =>
    createLogger(module).error(message, error),
};

/** 为模块创建专用日志器 */
export function createModuleLogger(module: string) {
  return createLogger(module);
}
