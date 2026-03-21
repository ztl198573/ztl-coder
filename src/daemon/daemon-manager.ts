/**
 * 守护进程管理器
 * 持久化后台进程，支持代码索引、AST 缓存等
 *
 * 架构:
 *   - HTTP 服务器监听 localhost
 *   - 状态文件: ~/.ztl-coder/daemon-{name}.json
 *   - 空闲超时自动关闭（默认 30 分钟）
 *   - 健康检查机制
 */

import { z } from "zod";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  unlinkSync,
  renameSync,
} from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { createConnection } from "node:net";
import { spawn, ChildProcess } from "node:child_process";
import { log } from "../utils/logger";
import { PLUGIN_META } from "../utils/config";

// ============================================
// 类型定义
// ============================================

export interface DaemonState {
  pid: number;
  port: number;
  token: string;
  startedAt: string;
  name: string;
  version: string;
}

export interface DaemonConfig {
  name: string;
  idleTimeoutMs?: number;
  portRange?: { min: number; max: number };
  onCommand?: (command: string, args: unknown[]) => Promise<unknown>;
}

export interface DaemonHealth {
  status: "healthy" | "unhealthy" | "not_running";
  uptime?: number;
  port?: number;
  error?: string;
}

// ============================================
// 常量
// ============================================

const ZTL_DIR = join(homedir(), ".ztl-coder");
const DEFAULT_IDLE_TIMEOUT = 30 * 60 * 1000; // 30 分钟
const DEFAULT_PORT_RANGE = { min: 10000, max: 60000 };

// ============================================
// 状态文件管理
// ============================================

function getStateFilePath(name: string): string {
  return join(ZTL_DIR, `daemon-${name}.json`);
}

function readState(name: string): DaemonState | null {
  const stateFile = getStateFilePath(name);
  if (!existsSync(stateFile)) {
    return null;
  }
  try {
    return JSON.parse(readFileSync(stateFile, "utf-8"));
  } catch {
    return null;
  }
}

function writeState(name: string, state: DaemonState): void {
  mkdirSync(ZTL_DIR, { recursive: true });
  const stateFile = getStateFilePath(name);
  const tmpFile = `${stateFile}.tmp`;
  writeFileSync(tmpFile, JSON.stringify(state, null, 2), { mode: 0o600 });
  renameSync(tmpFile, stateFile);
}

function clearState(name: string): void {
  const stateFile = getStateFilePath(name);
  try {
    unlinkSync(stateFile);
  } catch {
    // 忽略错误
  }
}

// ============================================
// 端口检查
// ============================================

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createConnection(port, "127.0.0.1")
      .on("connect", () => {
        server.end();
        resolve(false); // 端口被占用
      })
      .on("error", () => {
        resolve(true); // 端口可用
      });
  });
}

async function findAvailablePort(
  range: { min: number; max: number } = DEFAULT_PORT_RANGE
): Promise<number> {
  const MAX_RETRIES = 10;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const port =
      range.min + Math.floor(Math.random() * (range.max - range.min));
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port after ${MAX_RETRIES} attempts`);
}

// ============================================
// 进程检查
// ============================================

function isProcessRunning(pid: number): boolean {
  try {
    // 发送信号 0 检查进程是否存在
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

// ============================================
// 守护进程管理器
// ============================================

export class DaemonManager {
  private name: string;
  private config: DaemonConfig;
  private childProcess: ChildProcess | null = null;
  private state: DaemonState | null = null;

  constructor(config: DaemonConfig) {
    this.name = config.name;
    this.config = {
      idleTimeoutMs: DEFAULT_IDLE_TIMEOUT,
      portRange: DEFAULT_PORT_RANGE,
      ...config,
    };
  }

  /**
   * 检查守护进程是否运行
   */
  async isRunning(): Promise<boolean> {
    const state = readState(this.name);
    if (!state) {
      return false;
    }

    // 检查进程是否存在
    if (!isProcessRunning(state.pid)) {
      clearState(this.name);
      return false;
    }

    // 检查端口是否响应
    try {
      const response = await fetch(`http://127.0.0.1:${state.port}/health`);
      if (response.ok) {
        this.state = state;
        return true;
      }
    } catch {
      // 端口无响应
    }

    clearState(this.name);
    return false;
  }

  /**
   * 获取守护进程状态
   */
  getState(): DaemonState | null {
    return this.state;
  }

  /**
   * 启动守护进程
   */
  async start(): Promise<DaemonState> {
    // 检查是否已运行
    if (await this.isRunning()) {
      log.info(`守护进程 ${this.name} 已运行`, {
        operation: "daemon_start",
        data: { pid: this.state?.pid },
      });
      return this.state!;
    }

    const port = await findAvailablePort(this.config.portRange);
    const token = generateToken();

    log.info(`启动守护进程 ${this.name}`, {
      operation: "daemon_start",
      data: { port },
    });

    // 启动子进程
    // 注意：实际实现需要单独的 daemon-server 脚本
    // 这里只是框架
    const serverPath = join(
      process.cwd(),
      "dist",
      "daemon-server.js"
    );

    // 如果服务器脚本不存在，返回模拟状态
    if (!existsSync(serverPath)) {
      log.warn(`守护进程脚本不存在: ${serverPath}`, {
        operation: "daemon_start",
      });

      // 创建模拟状态
      const mockState: DaemonState = {
        pid: process.pid,
        port,
        token,
        startedAt: new Date().toISOString(),
        name: this.name,
        version: PLUGIN_META.version,
      };

      writeState(this.name, mockState);
      this.state = mockState;
      return mockState;
    }

    // 启动实际的守护进程
    this.childProcess = spawn(process.execPath, [serverPath], {
      env: {
        ...process.env,
        DAEMON_NAME: this.name,
        DAEMON_PORT: String(port),
        DAEMON_TOKEN: token,
        DAEMON_IDLE_TIMEOUT: String(this.config.idleTimeoutMs),
      },
      stdio: ["ignore", "pipe", "pipe"],
      detached: true,
    });

    this.childProcess.unref();

    const state: DaemonState = {
      pid: this.childProcess.pid!,
      port,
      token,
      startedAt: new Date().toISOString(),
      name: this.name,
      version: PLUGIN_META.version,
    };

    writeState(this.name, state);
    this.state = state;

    log.info(`守护进程 ${this.name} 已启动`, {
      operation: "daemon_start",
      data: { pid: state.pid, port },
    });

    return state;
  }

  /**
   * 停止守护进程
   */
  async stop(): Promise<void> {
    const state = readState(this.name);
    if (!state) {
      return;
    }

    try {
      // 发送停止请求
      await fetch(`http://127.0.0.1:${state.port}/shutdown`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${state.token}`,
        },
      });
    } catch {
      // 如果 HTTP 请求失败，尝试发送信号
      try {
        process.kill(state.pid, "SIGTERM");
      } catch {
        // 忽略错误
      }
    }

    clearState(this.name);
    this.state = null;

    log.info(`守护进程 ${this.name} 已停止`, {
      operation: "daemon_stop",
    });
  }

  /**
   * 发送命令到守护进程
   */
  async sendCommand<T = unknown>(
    command: string,
    args: unknown[] = []
  ): Promise<T> {
    if (!(await this.isRunning())) {
      await this.start();
    }

    const state = this.state!;

    const response = await fetch(
      `http://127.0.0.1:${state.port}/command`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${state.token}`,
        },
        body: JSON.stringify({ command, args }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Daemon command failed: ${error}`);
    }

    return response.json() as Promise<T>;
  }

  /**
   * 健康检查
   */
  async health(): Promise<DaemonHealth> {
    const state = readState(this.name);
    if (!state) {
      return { status: "not_running" };
    }

    try {
      const response = await fetch(
        `http://127.0.0.1:${state.port}/health`,
        {
          headers: {
            Authorization: `Bearer ${state.token}`,
          },
        }
      );

      if (!response.ok) {
        return { status: "unhealthy", error: "Health check failed" };
      }

      const data = (await response.json()) as {
        status: string;
        uptime?: number;
      };

      return {
        status: data.status === "healthy" ? "healthy" : "unhealthy",
        uptime: data.uptime,
        port: state.port,
      };
    } catch (error) {
      return {
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

// ============================================
// 辅助函数
// ============================================

function generateToken(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// ============================================
// 预定义的守护进程
// ============================================

/** 代码索引守护进程 */
export const codeIndexDaemon = new DaemonManager({
  name: "code-index",
  idleTimeoutMs: 60 * 60 * 1000, // 1 小时
});

/** AST 缓存守护进程 */
export const astCacheDaemon = new DaemonManager({
  name: "ast-cache",
  idleTimeoutMs: 60 * 60 * 1000, // 1 小时
});
