/**
 * Preamble 机制
 * 统一的启动检查，在每次工具/代理执行前运行
 */

import { z } from "zod";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { log } from "../utils/logger";
import { PLUGIN_META } from "../utils/config";

// ============================================
// Schema 定义
// ============================================

export const preambleSchema = {
  skill: z.string().describe("技能/工具名称"),
  checkUpdate: z.boolean().optional().default(true).describe("是否检查更新"),
  trackSession: z.boolean().optional().default(true).describe("是否跟踪会话"),
  checkTelemetry: z.boolean().optional().default(true).describe("是否检查遥测设置"),
};

export type PreambleInput = {
  skill: string;
  checkUpdate?: boolean;
  trackSession?: boolean;
  checkTelemetry?: boolean;
};

export type PreambleOutput = {
  sessionId: string;
  branch: string;
  startTime: number;
  needsUpdate: boolean;
  updateMessage?: string;
  telemetryStatus: "enabled" | "anonymous" | "disabled" | "not_prompted";
  sessions: number;
};

// ============================================
// 常量
// ============================================

const ZTL_DIR = join(homedir(), ".ztl-coder");
const SESSIONS_DIR = join(ZTL_DIR, "sessions");
const CONFIG_FILE = join(ZTL_DIR, "config.json");
const TELEMETRY_PROMPTED_FILE = join(ZTL_DIR, ".telemetry-prompted");

// ============================================
// 执行函数
// ============================================

export async function executePreamble(input: PreambleInput): Promise<{
  success: boolean;
  output: PreambleOutput;
  message: string;
}> {
  const startTime = Date.now();
  const sessionId = `${process.pid}-${startTime}`;
  const output: Partial<PreambleOutput> = { sessionId, startTime };

  log.info(`Preamble 开始: ${input.skill}`, { operation: "preamble" });

  try {
    // 1. 确保目录存在
    mkdirSync(SESSIONS_DIR, { recursive: true });

    // 2. 检查更新
    let updateMessage: string | undefined;
    let needsUpdate = false;
    if (input.checkUpdate !== false) {
      const updateCheck = checkForUpdate();
      needsUpdate = updateCheck.needsUpdate;
      updateMessage = updateCheck.message;
      output.needsUpdate = needsUpdate;
      output.updateMessage = updateMessage;
    }

    // 3. 获取当前分支（使用安全的 execFileSync）
    let branch = "unknown";
    try {
      const result = execFileSync("git", ["branch", "--show-current"], {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
        timeout: 5000,
      });
      branch = result.trim() || "detached";
    } catch {
      branch = "no-git";
    }
    output.branch = branch;

    // 4. 会话跟踪
    if (input.trackSession !== false) {
      // 创建会话文件
      const sessionFile = join(SESSIONS_DIR, String(process.ppid));
      writeFileSync(sessionFile, String(startTime));

      // 统计活跃会话（2小时内）- 使用原生 fs 操作
      let sessions = 0;
      try {
        const now = Date.now();
        const twoHoursAgo = now - 2 * 60 * 60 * 1000;
        const files = readdirSync(SESSIONS_DIR);
        for (const file of files) {
          const filePath = join(SESSIONS_DIR, file);
          try {
            const stat = statSync(filePath);
            if (stat.mtimeMs > twoHoursAgo) {
              sessions++;
            }
          } catch {
            // 忽略无法访问的文件
          }
        }
      } catch {
        sessions = 1;
      }
      output.sessions = sessions;
    }

    // 5. 遥测状态
    if (input.checkTelemetry !== false) {
      output.telemetryStatus = getTelemetryStatus();
    }

    // 6. 生成消息
    const message = formatPreambleMessage(output as PreambleOutput, input.skill);

    log.info(`Preamble 完成: ${input.skill}`, {
      operation: "preamble",
      data: { branch, sessions: output.sessions },
    });

    return {
      success: true,
      output: output as PreambleOutput,
      message,
    };
  } catch (error) {
    log.error(`Preamble 失败: ${input.skill}`, { operation: "preamble" });
    return {
      success: false,
      output: output as PreambleOutput,
      message: `Preamble 执行出错: ${error}`,
    };
  }
}

// ============================================
// 辅助函数
// ============================================

function checkForUpdate(): { needsUpdate: boolean; message?: string } {
  try {
    const currentVersion = PLUGIN_META.version;
    const lastCheckFile = join(ZTL_DIR, ".last-update-check");

    // 检查是否需要执行更新检查（每天一次）
    if (existsSync(lastCheckFile)) {
      const lastCheck = parseInt(readFileSync(lastCheckFile, "utf-8"), 10);
      const oneDayMs = 24 * 60 * 60 * 1000;
      if (Date.now() - lastCheck < oneDayMs) {
        return { needsUpdate: false };
      }
    }

    // 更新检查时间戳
    writeFileSync(lastCheckFile, String(Date.now()));

    // TODO: 实际检查 npm/github 最新版本
    // 目前只是占位符
    return { needsUpdate: false };
  } catch {
    return { needsUpdate: false };
  }
}

function getTelemetryStatus(): "enabled" | "anonymous" | "disabled" | "not_prompted" {
  try {
    if (existsSync(CONFIG_FILE)) {
      const config = JSON.parse(readFileSync(CONFIG_FILE, "utf-8"));
      return config.telemetry || "not_prompted";
    }
    return "not_prompted";
  } catch {
    return "not_prompted";
  }
}

function formatPreambleMessage(output: PreambleOutput, skill: string): string {
  const lines: string[] = [];

  if (output.needsUpdate && output.updateMessage) {
    lines.push(`📦 ${output.updateMessage}`);
  }

  lines.push(`🚀 ${skill} 已启动`);
  lines.push(`   分支: ${output.branch}`);
  lines.push(`   会话: ${output.sessionId.slice(0, 16)}...`);

  if (output.sessions > 1) {
    lines.push(`   活跃会话: ${output.sessions}`);
  }

  return lines.join("\n");
}

// ============================================
// 遥测提示
// ============================================

export function shouldPromptTelemetry(): boolean {
  return !existsSync(TELEMETRY_PROMPTED_FILE);
}

export function markTelemetryPrompted(): void {
  mkdirSync(ZTL_DIR, { recursive: true });
  writeFileSync(TELEMETRY_PROMPTED_FILE, String(Date.now()));
}

export function setTelemetryStatus(status: "enabled" | "anonymous" | "disabled"): void {
  mkdirSync(ZTL_DIR, { recursive: true });

  let config: Record<string, unknown> = {};
  if (existsSync(CONFIG_FILE)) {
    try {
      config = JSON.parse(readFileSync(CONFIG_FILE, "utf-8"));
    } catch {
      // ignore
    }
  }

  config.telemetry = status;
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  markTelemetryPrompted();
}
