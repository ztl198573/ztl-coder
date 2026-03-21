/**
 * PTY 管理工具
 * 管理后台进程会话
 */

import { z } from "zod";
import { spawn, ChildProcess } from "child_process";
import { log } from "../utils/logger";
import { extractErrorMessage } from "../utils/errors";

/** PTY 会话 */
interface PtySession {
  id: string;
  command: string;
  args: string[];
  process: ChildProcess;
  startTime: Date;
  output: string[];
  status: "running" | "exited" | "error";
}

/** 活动会话映射 */
const activeSessions = new Map<string, PtySession>();

/** 生成会话 ID */
function generateSessionId(): string {
  return `pty_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ============================================
// pty_spawn
// ============================================

export const ptySpawnSchema = {
  command: z.string().describe("要执行的命令"),
  args: z.array(z.string()).optional().describe("命令参数"),
  cwd: z.string().optional().describe("工作目录"),
  env: z.record(z.string()).optional().describe("环境变量"),
};

export type PtySpawnInput = {
  command: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
};

export async function executePtySpawn(input: PtySpawnInput): Promise<string> {
  const sessionId = generateSessionId();

  try {
    log.info(`启动 PTY 会话: ${input.command}`, { operation: "pty_spawn", data: { sessionId } });

    const proc = spawn(input.command, input.args || [], {
      cwd: input.cwd || process.cwd(),
      env: { ...process.env, ...input.env },
      shell: true,
      stdio: ["pipe", "pipe", "pipe"],
    });

    const session: PtySession = {
      id: sessionId,
      command: input.command,
      args: input.args || [],
      process: proc,
      startTime: new Date(),
      output: [],
      status: "running",
    };

    // 收集输出
    proc.stdout?.on("data", (data: Buffer) => {
      const text = data.toString();
      session.output.push(text);
      log.debug(`PTY 输出: ${text.slice(0, 100)}`, { data: { sessionId } });
    });

    proc.stderr?.on("data", (data: Buffer) => {
      const text = data.toString();
      session.output.push(`[stderr] ${text}`);
      log.debug(`PTy 错误: ${text.slice(0, 100)}`, { data: { sessionId } });
    });

    proc.on("close", (code) => {
      session.status = code === 0 ? "exited" : "error";
      log.info(`PTY 会话结束: 退出码 ${code}`, { data: { sessionId, code } });
    });

    proc.on("error", (error) => {
      session.status = "error";
      session.output.push(`[error] ${error.message}`);
      log.error(`PTY 错误: ${error.message}`, { data: { sessionId } });
    });

    activeSessions.set(sessionId, session);

    return `## PTY 会话已启动

- **会话 ID**: ${sessionId}
- **命令**: ${input.command} ${(input.args || []).join(" ")}
- **工作目录**: ${input.cwd || process.cwd()}
- **状态**: 运行中

使用以下工具管理会话:
- \`pty_read\`: 读取输出
- \`pty_write\`: 发送输入
- \`pty_list\`: 查看所有会话
- \`pty_kill\`: 终止会话`;
  } catch (error) {
    const message = extractErrorMessage(error);
    log.error(`PTY 启动失败: ${message}`, { operation: "pty_spawn" });
    return `启动失败: ${message}`;
  }
}

// ============================================
// pty_write
// ============================================

export const ptyWriteSchema = {
  sessionId: z.string().describe("会话 ID"),
  input: z.string().describe("要发送的输入"),
  newline: z.boolean().optional().describe("是否添加换行符"),
};

export type PtyWriteInput = {
  sessionId: string;
  input: string;
  newline?: boolean;
};

export async function executePtyWrite(input: PtyWriteInput): Promise<string> {
  const session = activeSessions.get(input.sessionId);

  if (!session) {
    return `错误: 未找到会话 ${input.sessionId}`;
  }

  if (session.status !== "running") {
    return `错误: 会话 ${input.sessionId} 已结束`;
  }

  try {
    const text = input.newline !== false ? `${input.input}\n` : input.input;
    session.process.stdin?.write(text);

    log.info(`PTY 写入: ${input.input}`, { operation: "pty_write", data: { sessionId: input.sessionId } });

    return `已发送输入到会话 ${input.sessionId}`;
  } catch (error) {
    const message = extractErrorMessage(error);
    return `写入失败: ${message}`;
  }
}

// ============================================
// pty_read
// ============================================

export const ptyReadSchema = {
  sessionId: z.string().describe("会话 ID"),
  clear: z.boolean().optional().describe("是否清空已读输出"),
};

export type PtyReadInput = {
  sessionId: string;
  clear?: boolean;
};

export async function executePtyRead(input: PtyReadInput): Promise<string> {
  const session = activeSessions.get(input.sessionId);

  if (!session) {
    return `错误: 未找到会话 ${input.sessionId}`;
  }

  const output = session.output.join("");

  if (input.clear !== false) {
    session.output = [];
  }

  return `## PTY 输出 (会话: ${input.sessionId})

**状态**: ${session.status}

\`\`\`
${output || "(无新输出)"}
\`\`\``;
}

// ============================================
// pty_list
// ============================================

export const ptyListSchema = {};

export type PtyListInput = Record<string, never>;

export async function executePtyList(_input: PtyListInput): Promise<string> {
  if (activeSessions.size === 0) {
    return "## 活动会话\n\n无活动会话";
  }

  const output: string[] = ["## 活动会话\n"];

  for (const [id, session] of activeSessions) {
    const duration = Math.round((Date.now() - session.startTime.getTime()) / 1000);
    output.push(`### ${id}`);
    output.push(`- **命令**: ${session.command} ${session.args.join(" ")}`);
    output.push(`- **状态**: ${session.status}`);
    output.push(`- **运行时间**: ${duration}秒`);
    output.push(`- **输出缓冲**: ${session.output.length} 项`);
    output.push("");
  }

  return output.join("\n");
}

// ============================================
// pty_kill
// ============================================

export const ptyKillSchema = {
  sessionId: z.string().describe("要终止的会话 ID"),
  force: z.boolean().optional().describe("是否强制终止 (SIGKILL)"),
};

export type PtyKillInput = {
  sessionId: string;
  force?: boolean;
};

export async function executePtyKill(input: PtyKillInput): Promise<string> {
  const session = activeSessions.get(input.sessionId);

  if (!session) {
    return `错误: 未找到会话 ${input.sessionId}`;
  }

  try {
    const signal = input.force ? "SIGKILL" : "SIGTERM";
    session.process.kill(signal);

    log.info(`PTY 终止: ${signal}`, { operation: "pty_kill", data: { sessionId: input.sessionId } });

    // 清理会话
    activeSessions.delete(input.sessionId);

    return `## 会话已终止

- **会话 ID**: ${input.sessionId}
- **信号**: ${signal}
- **命令**: ${session.command}`;
  } catch (error) {
    const message = extractErrorMessage(error);
    return `终止失败: ${message}`;
  }
}

// ============================================
// 清理所有会话（进程退出时）
// ============================================

export function cleanupAllSessions(): void {
  for (const [id, session] of activeSessions) {
    try {
      session.process.kill("SIGTERM");
      log.info(`清理会话: ${id}`, { operation: "pty_cleanup" });
    } catch {
      // 忽略清理错误
    }
  }
  activeSessions.clear();
}

// 注册退出处理
process.on("exit", cleanupAllSessions);
process.on("SIGINT", () => {
  cleanupAllSessions();
  process.exit(0);
});
