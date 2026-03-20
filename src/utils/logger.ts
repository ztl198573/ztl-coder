/**
 * 结构化日志模块
 *
 * 提供分级日志、结构化输出和日志文件支持
 */

import { output, formatDuration } from "./output.ts";

/** 日志级别 */
export type LogLevel = "debug" | "info" | "warn" | "error" | "fatal" | "silent";

/** 日志级别数值 */
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
  silent: 5,
};

/** 日志字段 */
export interface LogFields {
  /** 模块名称 */
  module?: string;
  /** 操作名称 */
  operation?: string;
  /** 文件路径 */
  file?: string;
  /** 行号 */
  line?: number;
  /** 耗时（毫秒） */
  duration?: number;
  /** 附加数据 */
  data?: Record<string, unknown>;
  /** 错误对象 */
  error?: Error;
  /** 请求 ID */
  requestId?: string;
  /** 用户 ID */
  userId?: string;
}

/** 日志条目 */
export interface LogEntry {
  /** 时间戳 */
  timestamp: Date;
  /** 日志级别 */
  level: LogLevel;
  /** 消息 */
  message: string;
  /** 字段 */
  fields?: LogFields;
}

/** 日志配置 */
export interface LogConfig {
  /** 最小日志级别 */
  level: LogLevel;
  /** 是否输出到控制台 */
  console: boolean;
  /** 是否输出到文件 */
  file: boolean;
  /** 日志文件路径 */
  filePath?: string;
  /** 是否包含时间戳 */
  timestamp: boolean;
  /** 是否包含颜色 */
  color: boolean;
  /** 是否包含图标 */
  icons: boolean;
  /** 日志格式 */
  format: "text" | "json";
}

/** 默认配置 */
const DEFAULT_CONFIG: LogConfig = {
  level: "info",
  console: true,
  file: false,
  timestamp: true,
  color: true,
  icons: true,
  format: "text",
};

/** 结构化日志器 */
export class StructuredLogger {
  private config: LogConfig;
  private fileWriter: Bun.FileSink | null = null;

  constructor(config: Partial<LogConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    if (this.config.file && this.config.filePath) {
      this.initFileLogging();
    }
  }

  private async initFileLogging(): Promise<void> {
    if (!this.config.filePath) return;
    try {
      this.fileWriter = Bun.file(this.config.filePath).writer();
    } catch {
      // 文件日志初始化失败，忽略
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.config.level];
  }

  private formatEntry(entry: LogEntry): string {
    if (this.config.format === "json") {
      return JSON.stringify({
        timestamp: entry.timestamp.toISOString(),
        level: entry.level,
        message: entry.message,
        ...entry.fields,
      });
    }

    // 文本格式
    const parts: string[] = [];

    if (this.config.timestamp) {
      const time = entry.timestamp.toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      parts.push(output.dim(time));
    }

    const levelStr = this.formatLevel(entry.level);
    parts.push(levelStr);

    if (entry.fields?.module) {
      parts.push(output.dim(`[${entry.fields.module}]`));
    }

    parts.push(entry.message);

    if (entry.fields?.duration !== undefined) {
      parts.push(output.dim(`(${formatDuration(entry.fields.duration)})`));
    }

    return parts.join(" ");
  }

  private formatLevel(level: LogLevel): string {
    const icons = this.config.icons;
    const color = this.config.color;

    switch (level) {
      case "debug":
        return color ? output.debug(icons ? "◇ DEBUG" : "DEBUG") : "DEBUG";
      case "info":
        return color ? output.info(icons ? "ℹ INFO" : "INFO") : "INFO";
      case "warn":
        return color ? output.warning(icons ? "⚠ WARN" : "WARN") : "WARN";
      case "error":
        return color ? output.error(icons ? "✗ ERROR" : "ERROR") : "ERROR";
      case "fatal":
        return color ? output.applyStyle(icons ? "☠ FATAL" : "FATAL", "bold", "bgRed") : "FATAL";
      default:
        return level.toUpperCase();
    }
  }

  private async writeToFile(line: string): Promise<void> {
    if (this.fileWriter) {
      this.fileWriter.write(line + "\n");
      await this.fileWriter.flush();
    }
  }

  log(level: LogLevel, message: string, fields?: LogFields): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      fields,
    };

    const formatted = this.formatEntry(entry);

    if (this.config.console) {
      const consoleMethod = level === "error" || level === "fatal" ? "error" : level === "warn" ? "warn" : "log";
      console[consoleMethod](formatted);
    }

    if (this.config.file) {
      this.writeToFile(formatted);
    }
  }

  debug(message: string, fields?: LogFields): void {
    this.log("debug", message, fields);
  }

  info(message: string, fields?: LogFields): void {
    this.log("info", message, fields);
  }

  warn(message: string, fields?: LogFields): void {
    this.log("warn", message, fields);
  }

  error(message: string, fields?: LogFields): void {
    this.log("error", message, fields);
  }

  fatal(message: string, fields?: LogFields): void {
    this.log("fatal", message, fields);
  }

  /** 创建子日志器 */
  child(module: string): ModuleLogger {
    return new ModuleLogger(this, module);
  }

  /** 关闭日志器 */
  async close(): Promise<void> {
    if (this.fileWriter) {
      await this.fileWriter.end();
      this.fileWriter = null;
    }
  }
}

/** 模块日志器 */
export class ModuleLogger {
  private logger: StructuredLogger;
  private module: string;

  constructor(logger: StructuredLogger, module: string) {
    this.logger = logger;
    this.module = module;
  }

  debug(message: string, data?: Record<string, unknown>): void {
    this.logger.debug(message, { module: this.module, data });
  }

  info(message: string, data?: Record<string, unknown>): void {
    this.logger.info(message, { module: this.module, data });
  }

  warn(message: string, data?: Record<string, unknown>): void {
    this.logger.warn(message, { module: this.module, data });
  }

  error(message: string, error?: unknown): void {
    const fields: LogFields = { module: this.module };
    if (error instanceof Error) {
      fields.error = error;
      fields.data = { errorMessage: error.message, stack: error.stack };
    } else if (error) {
      fields.data = { error };
    }
    this.logger.error(message, fields);
  }
}

/** 全局日志器 */
let globalLogger: StructuredLogger | null = null;

/** 获取全局日志器 */
export function getLogger(): StructuredLogger {
  if (!globalLogger) {
    globalLogger = initLoggerFromEnv();
  }
  return globalLogger;
}

/** 从环境变量初始化日志器 */
function initLoggerFromEnv(): StructuredLogger {
  const level = (process.env.LOG_LEVEL as LogLevel) || "info";
  const format = (process.env.LOG_FORMAT as "text" | "json") || "text";
  const filePath = process.env.LOG_FILE;
  const color = process.env.NO_COLOR !== "true";
  const icons = process.env.LOG_ICONS !== "false";

  return new StructuredLogger({
    level,
    format,
    filePath,
    color,
    icons,
    file: !!filePath,
    console: true,
    timestamp: true,
  });
}

/** 创建日志器 */
export function createLogger(config: Partial<LogConfig> = {}): StructuredLogger {
  return new StructuredLogger(config);
}

/** 为模块创建专用日志器 */
export function createModuleLogger(module: string): ModuleLogger {
  return getLogger().child(module);
}

/** 便捷日志方法 */
export const log = {
  debug: (message: string, fields?: LogFields) => getLogger().debug(message, fields),
  info: (message: string, fields?: LogFields) => getLogger().info(message, fields),
  warn: (message: string, fields?: LogFields) => getLogger().warn(message, fields),
  error: (message: string, fields?: LogFields) => getLogger().error(message, fields),
  fatal: (message: string, fields?: LogFields) => getLogger().fatal(message, fields),
};

/** 计时日志辅助器 */
export class LogTimer {
  private logger: ModuleLogger;
  private operation: string;
  private startTime: number;

  constructor(logger: ModuleLogger, operation: string) {
    this.logger = logger;
    this.operation = operation;
    this.startTime = Date.now();
    this.logger.debug(`开始: ${operation}`);
  }

  end(message?: string): number {
    const duration = Date.now() - this.startTime;
    this.logger.info(`${message || this.operation} 完成`, { duration });
    return duration;
  }
}

/** 创建计时器 */
export function startTimer(logger: ModuleLogger, operation: string): LogTimer {
  return new LogTimer(logger, operation);
}
