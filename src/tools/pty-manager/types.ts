/**
 * PTY 管理器类型定义
 *
 * 支持后台进程的创建、写入、读取和管理
 */

/** PTY 会话状态 */
export type PtySessionStatus = "running" | "exited" | "killed" | "error";

/** PTY 会话配置 */
export interface PtySessionOptions {
  /** 命令 */
  command: string;
  /** 命令参数 */
  args?: string[];
  /** 环境变量 */
  env?: Record<string, string>;
  /** 工作目录 */
  cwd?: string;
  /** 终端列数 */
  cols?: number;
  /** 终端行数 */
  rows?: number;
  /** 自动重启 */
  autoRestart?: boolean;
  /** 最大重启次数 */
  maxRestarts?: number;
  /** 输出编码 */
  encoding?: BufferEncoding;
}

/** PTY 会话信息 */
export interface PtySession {
  /** 会话 ID */
  id: string;
  /** 会话名称 */
  name: string;
  /** 命令 */
  command: string;
  /** 命令参数 */
  args: string[];
  /** 当前状态 */
  status: PtySessionStatus;
  /** 进程 ID */
  pid?: number;
  /** 退出码 */
  exitCode?: number;
  /** 创建时间 */
  createdAt: Date;
  /** 最后活动时间 */
  lastActivityAt: Date;
  /** 输出缓冲区 */
  outputBuffer: string[];
  /** 最大缓冲区行数 */
  maxBufferLines: number;
  /** 重启次数 */
  restartCount: number;
  /** 配置选项 */
  options: PtySessionOptions;
}

/** PTY 会话创建结果 */
export interface PtySpawnResult {
  /** 是否成功 */
  success: boolean;
  /** 会话 ID（成功时） */
  sessionId?: string;
  /** 错误信息（失败时） */
  error?: string;
}

/** PTY 写入结果 */
export interface PtyWriteResult {
  /** 是否成功 */
  success: boolean;
  /** 写入的字节数 */
  bytesWritten?: number;
  /** 错误信息 */
  error?: string;
}

/** PTY 读取选项 */
export interface PtyReadOptions {
  /** 是否清除已读取的缓冲区 */
  clearBuffer?: boolean;
  /** 最大读取行数 */
  maxLines?: number;
  /** 等待新输出的超时时间（毫秒） */
  timeout?: number;
}

/** PTY 读取结果 */
export interface PtyReadResult {
  /** 是否成功 */
  success: boolean;
  /** 输出内容 */
  output?: string;
  /** 是否有更多数据 */
  hasMore?: boolean;
  /** 错误信息 */
  error?: string;
}

/** PTY 管理器配置 */
export interface PtyManagerConfig {
  /** 默认终端列数 */
  defaultCols: number;
  /** 默认终端行数 */
  defaultRows: number;
  /** 默认最大缓冲区行数 */
  defaultMaxBufferLines: number;
  /** 会话检查间隔（毫秒） */
  healthCheckInterval: number;
  /** 最大并发会话数 */
  maxSessions: number;
}

/** PTY 管理器统计信息 */
export interface PtyManagerStats {
  /** 活动会话数 */
  activeSessions: number;
  /** 总会话数（包括已退出的） */
  totalSessions: number;
  /** 运行中的会话数 */
  runningCount: number;
  /** 已退出的会话数 */
  exitedCount: number;
  /** 错误的会话数 */
  errorCount: number;
}

/** 默认 PTY 管理器配置 */
export const DEFAULT_PTY_CONFIG: PtyManagerConfig = {
  defaultCols: 80,
  defaultRows: 24,
  defaultMaxBufferLines: 1000,
  healthCheckInterval: 5000,
  maxSessions: 10,
};
