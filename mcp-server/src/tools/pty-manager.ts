/**
 * PTY 管理工具
 * 提供伪终端会话管理能力
 */

import { z } from "zod";
import { spawn, ChildProcess } from "node:child_process";
import { log } from "../utils/logger";
import { extractErrorMessage } from "../utils/errors";
import { LIMITS } from "../utils/config";

/** PTY 操作类型 */
type PtyOperation = "spawn" | "write" | "read" | "list" | "kill";

/** PTY 会话接口 */
interface PtySession {
  id: string;
  process: ChildProcess;
  command: string;
  args: string[];
  cwd: string;
  pid: number;
  output: string[];
  createdAt: Date;
}

/** PTY 会话存储 */
const sessions = new Map<string, PtySession>();

/** 工具 Schema */
export const ptyManagerSchema = {
  operation: z
    .enum(["spawn", "write", "read", "list", "kill"])
    .describe("操作类型"),
  id: z.string().optional().describe("会话 ID"),
  command: z.string().optional().describe("要执行的命令"),
  args: z.array(z.string()).optional().describe("命令参数"),
  data: z.string().optional().describe("要写入的数据"),
  cwd: z.string().optional().describe("工作目录"),
};

/** 工具输入类型 */
export type PtyManagerInput = {
  operation: PtyOperation;
  id?: string;
  command?: string;
  args?: string[];
  data?: string;
  cwd?: string;
};

/** 生成唯一 ID */
function generateId(): string {
  return `pty_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/** 检查会话数量限制 */
function checkSessionLimit(): boolean {
  return sessions.size < LIMITS.maxPtySessions;
}

/** 执行 PTY 操作 */
export async function executePtyManager(input: PtyManagerInput): Promise<string> {
  switch (input.operation) {
    case "spawn":
      return spawnPty(input);
    case "write":
      return writeToPty(input);
    case "read":
      return readFromPty(input);
    case "list":
      return listPtys();
    case "kill":
      return killPty(input);
    default:
      return `未知操作: ${input.operation}`;
  }
}

/** 创建 PTY 会话 */
function spawnPty(input: PtyManagerInput): string {
  if (!input.command) {
    return "错误: 缺少 command 参数";
  }

  if (!checkSessionLimit()) {
    return `错误: 已达到最大 PTY 会话数限制 (${LIMITS.maxPtySessions})`;
  }

  const id = generateId();
  const args = input.args || [];
  const cwd = input.cwd || process.cwd();

  try {
    const proc = spawn(input.command, args, {
      cwd,
      shell: true,
      stdio: ["pipe", "pipe", "pipe"],
    });

    const session: PtySession = {
      id,
      process: proc,
      command: input.command,
      args,
      cwd,
      pid: proc.pid || 0,
      output: [],
      createdAt: new Date(),
    };

    proc.stdout?.on("data", (data) => {
      session.output.push(data.toString());
      if (session.output.length > LIMITS.maxPtyOutputLines) {
        session.output.shift();
      }
    });

    proc.stderr?.on("data", (data) => {
      session.output.push(`[stderr] ${data.toString()}`);
    });

    proc.on("close", (code) => {
      session.output.push(`\n[进程退出，代码: ${code}]`);
      log.info("pty-manager", `会话 ${id} 已退出`);
    });

    sessions.set(id, session);
    log.info("pty-manager", `创建会话: ${id}`);

    return `PTY 会话已创建
- ID: ${id}
- 命令: ${input.command} ${args.join(" ")}
- 工作目录: ${cwd}
- PID: ${session.pid}
- 提示: 使用 read 读取输出，使用 write 发送输入`;
  } catch (error) {
    return `创建失败: ${extractErrorMessage(error)}`;
  }
}

/** 写入数据到 PTY */
function writeToPty(input: PtyManagerInput): string {
  if (!input.id || !input.data) {
    return "错误: 缺少 id 或 data 参数";
  }

  const session = sessions.get(input.id);
  if (!session) {
    return `错误: 会话 ${input.id} 不存在`;
  }

  try {
    session.process.stdin?.write(input.data);
    return `已写入 ${input.data.length} 字节到会话 ${input.id}`;
  } catch (error) {
    return `写入失败: ${extractErrorMessage(error)}`;
  }
}

/** 从 PTY 读取数据 */
function readFromPty(input: PtyManagerInput): string {
  if (!input.id) {
    return "错误: 缺少 id 参数";
  }

  const session = sessions.get(input.id);
  if (!session) {
    return `错误: 会话 ${input.id} 不存在`;
  }

  const output = session.output.join("");
  session.output = [];

  return output || "无新输出";
}

/** 列出所有 PTY 会话 */
function listPtys(): string {
  if (sessions.size === 0) {
    return "无活跃的 PTY 会话";
  }

  const lines: string[] = ["## 活跃的 PTY 会话\n"];
  lines.push(`当前会话数: ${sessions.size}/${LIMITS.maxPtySessions}\n`);

  for (const [id, session] of sessions) {
    lines.push(`\n### ${id}`);
    lines.push(`- 命令: ${session.command} ${session.args.join(" ")}`);
    lines.push(`- 工作目录: ${session.cwd}`);
    lines.push(`- PID: ${session.pid}`);
    lines.push(`- 创建时间: ${session.createdAt.toISOString()}`);
    lines.push(`- 输出行数: ${session.output.length}`);
  }

  return lines.join("\n");
}

/** 终止 PTY 会话 */
function killPty(input: PtyManagerInput): string {
  if (!input.id) {
    return "错误: 缺少 id 参数";
  }

  const session = sessions.get(input.id);
  if (!session) {
    return `错误: 会话 ${input.id} 不存在`;
  }

  try {
    session.process.kill();
    sessions.delete(input.id);
    log.info("pty-manager", `已终止会话: ${input.id}`);
    return `会话 ${input.id} 已终止`;
  } catch (error) {
    return `终止失败: ${extractErrorMessage(error)}`;
  }
}
