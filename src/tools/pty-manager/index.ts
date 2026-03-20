/**
 * PTY 管理器模块
 *
 * 提供后台进程会话的创建、写入、读取和管理功能
 */

export { createPtyManager, type PtyManager } from "./manager.ts";

export type {
  PtySession,
  PtySessionOptions,
  PtySessionStatus,
  PtySpawnResult,
  PtyWriteResult,
  PtyReadOptions,
  PtyReadResult,
  PtyManagerConfig,
  PtyManagerStats,
} from "./types.ts";

export { DEFAULT_PTY_CONFIG } from "./types.ts";
