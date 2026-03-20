/**
 * PTY 管理器实现
 *
 * 使用 Bun 子进程 API 模拟 PTY 会话管理
 */

import type {
  PtySession,
  PtySessionOptions,
  PtySessionStatus,
  PtyManagerConfig,
  PtyManagerStats,
  PtySpawnResult,
  PtyWriteResult,
  PtyReadOptions,
  PtyReadResult,
} from "./types.ts";
import { DEFAULT_PTY_CONFIG } from "./types.ts";

/** 生成唯一会话 ID */
function generateSessionId(): string {
  return `pty_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * 创建 PTY 管理器
 */
export function createPtyManager(config: Partial<PtyManagerConfig> = {}) {
  const cfg: PtyManagerConfig = { ...DEFAULT_PTY_CONFIG, ...config };
  const sessions = new Map<string, PtySession>();
  const processes = new Map<string, Bun.Subprocess>();
  let healthCheckTimer: Timer | null = null;

  /** 更新会话状态 */
  function updateSessionStatus(sessionId: string, status: PtySessionStatus, exitCode?: number): void {
    const session = sessions.get(sessionId);
    if (session) {
      session.status = status;
      session.exitCode = exitCode;
      session.lastActivityAt = new Date();
    }
  }

  /** 添加输出到缓冲区 */
  function addToBuffer(sessionId: string, output: string): void {
    const session = sessions.get(sessionId);
    if (!session) return;

    const lines = output.split("\n");
    for (const line of lines) {
      if (line.trim()) {
        session.outputBuffer.push(line);
      }
    }

    // 限制缓冲区大小
    while (session.outputBuffer.length > session.maxBufferLines) {
      session.outputBuffer.shift();
    }

    session.lastActivityAt = new Date();
  }

  /** 启动健康检查 */
  function startHealthCheck(): void {
    if (healthCheckTimer) return;

    healthCheckTimer = setInterval(() => {
      for (const [sessionId, proc] of processes) {
        const session = sessions.get(sessionId);
        if (!session) continue;

        // 检查进程是否仍在运行
        if (proc.exitCode !== null) {
          updateSessionStatus(sessionId, "exited", proc.exitCode);

          // 自动重启逻辑
          if (session.options.autoRestart && session.restartCount < (session.options.maxRestarts || 3)) {
            restartSession(sessionId);
          }
        }
      }
    }, cfg.healthCheckInterval);
  }

  /** 停止健康检查 */
  function stopHealthCheck(): void {
    if (healthCheckTimer) {
      clearInterval(healthCheckTimer);
      healthCheckTimer = null;
    }
  }

  /** 重启会话 */
  async function restartSession(sessionId: string): Promise<boolean> {
    const session = sessions.get(sessionId);
    if (!session) return false;

    session.restartCount++;
    const oldProc = processes.get(sessionId);

    if (oldProc && oldProc.exitCode === null) {
      oldProc.kill();
    }

    processes.delete(sessionId);

    try {
      const proc = Bun.spawn({
        cmd: [session.command, ...session.args],
        cwd: session.options.cwd,
        env: { ...process.env, ...session.options.env },
        stdout: "pipe",
        stderr: "pipe",
        stdin: "pipe",
      });

      processes.set(sessionId, proc);
      session.pid = proc.pid;
      session.status = "running";
      session.outputBuffer = [];

      // 监听输出
      const reader = proc.stdout.getReader();
      const errReader = proc.stderr.getReader();

      const readOutput = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            addToBuffer(sessionId, new TextDecoder().decode(value));
          }
        } catch {
          // 忽略读取错误
        }
      };

      const readError = async () => {
        try {
          while (true) {
            const { done, value } = await errReader.read();
            if (done) break;
            addToBuffer(sessionId, new TextDecoder().decode(value));
          }
        } catch {
          // 忽略读取错误
        }
      };

      readOutput();
      readError();

      return true;
    } catch {
      updateSessionStatus(sessionId, "error");
      return false;
    }
  }

  return {
    /** 创建新的 PTY 会话 */
    spawn(
      name: string,
      options: PtySessionOptions,
    ): PtySpawnResult {
      // 检查最大会话数
      if (sessions.size >= cfg.maxSessions) {
        return {
          success: false,
          error: `已达到最大会话数限制 (${cfg.maxSessions})`,
        };
      }

      const sessionId = generateSessionId();

      try {
        const proc = Bun.spawn({
          cmd: [options.command, ...(options.args || [])],
          cwd: options.cwd,
          env: { ...process.env, ...options.env },
          stdout: "pipe",
          stderr: "pipe",
          stdin: "pipe",
        });

        const session: PtySession = {
          id: sessionId,
          name,
          command: options.command,
          args: options.args || [],
          status: "running",
          pid: proc.pid,
          createdAt: new Date(),
          lastActivityAt: new Date(),
          outputBuffer: [],
          maxBufferLines: cfg.defaultMaxBufferLines,
          restartCount: 0,
          options: {
            cols: options.cols || cfg.defaultCols,
            rows: options.rows || cfg.defaultRows,
            ...options,
          },
        };

        sessions.set(sessionId, session);
        processes.set(sessionId, proc);

        // 监听输出
        const reader = proc.stdout.getReader();
        const errReader = proc.stderr.getReader();

        const readOutput = async () => {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              addToBuffer(sessionId, new TextDecoder().decode(value));
            }
          } catch {
            // 忽略读取错误
          }
        };

        const readError = async () => {
          try {
            while (true) {
              const { done, value } = await errReader.read();
              if (done) break;
              addToBuffer(sessionId, new TextDecoder().decode(value));
            }
          } catch {
            // 忽略读取错误
          }
        };

        readOutput();
        readError();

        // 监听退出
        proc.exited.then((code) => {
          updateSessionStatus(sessionId, "exited", code);
        });

        // 启动健康检查
        startHealthCheck();

        return {
          success: true,
          sessionId,
        };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    },

    /** 向会话写入数据 */
    write(sessionId: string, data: string): PtyWriteResult {
      const proc = processes.get(sessionId);
      const session = sessions.get(sessionId);

      if (!proc || !session) {
        return {
          success: false,
          error: "会话不存在",
        };
      }

      if (session.status !== "running") {
        return {
          success: false,
          error: `会话状态为 ${session.status}，无法写入`,
        };
      }

      try {
        const writer = proc.stdin?.getWriter();
        if (!writer) {
          return {
            success: false,
            error: "无法获取标准输入流",
          };
        }

        const encoded = new TextEncoder().encode(data);
        writer.write(encoded);
        writer.releaseLock();

        session.lastActivityAt = new Date();

        return {
          success: true,
          bytesWritten: encoded.length,
        };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    },

    /** 读取会话输出 */
    read(sessionId: string, options: PtyReadOptions = {}): PtyReadResult {
      const session = sessions.get(sessionId);

      if (!session) {
        return {
          success: false,
          error: "会话不存在",
        };
      }

      const maxLines = options.maxLines || session.outputBuffer.length;
      const lines = session.outputBuffer.slice(0, maxLines);
      const output = lines.join("\n");

      if (options.clearBuffer) {
        session.outputBuffer = session.outputBuffer.slice(maxLines);
      }

      return {
        success: true,
        output,
        hasMore: session.outputBuffer.length > maxLines,
      };
    },

    /** 列出所有会话 */
    list(): PtySession[] {
      return Array.from(sessions.values());
    },

    /** 获取指定会话 */
    get(sessionId: string): PtySession | undefined {
      return sessions.get(sessionId);
    },

    /** 终止会话 */
    kill(sessionId: string): { success: boolean; error?: string } {
      const proc = processes.get(sessionId);
      const session = sessions.get(sessionId);

      if (!session) {
        return {
          success: false,
          error: "会话不存在",
        };
      }

      if (proc && proc.exitCode === null) {
        proc.kill();
      }

      updateSessionStatus(sessionId, "killed");
      processes.delete(sessionId);

      return { success: true };
    },

    /** 清理已退出的会话 */
    cleanup(): number {
      let cleaned = 0;

      for (const [sessionId, session] of sessions) {
        if (session.status === "exited" || session.status === "killed" || session.status === "error") {
          sessions.delete(sessionId);
          processes.delete(sessionId);
          cleaned++;
        }
      }

      return cleaned;
    },

    /** 获取统计信息 */
    stats(): PtyManagerStats {
      const all = Array.from(sessions.values());

      return {
        activeSessions: all.filter((s) => s.status === "running").length,
        totalSessions: all.length,
        runningCount: all.filter((s) => s.status === "running").length,
        exitedCount: all.filter((s) => s.status === "exited").length,
        errorCount: all.filter((s) => s.status === "error").length,
      };
    },

    /** 关闭所有会话并停止管理器 */
    shutdown(): void {
      stopHealthCheck();

      for (const [sessionId, proc] of processes) {
        if (proc.exitCode === null) {
          proc.kill();
        }
        const session = sessions.get(sessionId);
        if (session) {
          session.status = "killed";
        }
      }

      processes.clear();
    },
  };
}

export type PtyManager = ReturnType<typeof createPtyManager>;
