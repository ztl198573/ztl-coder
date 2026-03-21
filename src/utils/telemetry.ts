/**
 * Telemetry 系统
 * 本地使用分析，收集技能使用统计
 */

import { z } from "zod";
import { log } from "./logger";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  appendFileSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";

// ============================================
// 类型定义
// ============================================

export const telemetryEventSchema = z.object({
  timestamp: z.string().describe("ISO 时间戳"),
  event: z.string().describe("事件类型"),
  skill: z.string().optional().describe("技能名称"),
  agent: z.string().optional().describe("代理名称"),
  tool: z.string().optional().describe("工具名称"),
  duration: z.number().optional().describe("持续时间（毫秒）"),
  success: z.boolean().optional().describe("是否成功"),
  metadata: z.record(z.unknown()).optional().describe("额外元数据"),
});

export type TelemetryEvent = z.infer<typeof telemetryEventSchema>;

export const telemetryConfigSchema = z.object({
  enabled: z.boolean().default(true).describe("是否启用遥测"),
  anonymousId: z.string().describe("匿名用户 ID"),
  sessionStartDate: z.string().describe("会话开始日期"),
});

export type TelemetryConfig = z.infer<typeof telemetryConfigSchema>;

// ============================================
// 常量
// ============================================

const ZTL_DIR = join(homedir(), ".ztl-coder");
const TELEMETRY_DIR = join(ZTL_DIR, "telemetry");
const CONFIG_FILE = join(TELEMETRY_DIR, "config.json");
const EVENTS_FILE = join(TELEMETRY_DIR, "events.log");
const STATS_FILE = join(TELEMETRY_DIR, "stats.json");

// ============================================
// 配置管理
// ============================================

let config: TelemetryConfig | null = null;

function initConfig(): TelemetryConfig {
  mkdirSync(TELEMETRY_DIR, { recursive: true });

  if (existsSync(CONFIG_FILE)) {
    try {
      const data = JSON.parse(readFileSync(CONFIG_FILE, "utf-8"));
      return telemetryConfigSchema.parse(data);
    } catch {
      // 配置损坏，重新创建
    }
  }

  // 创建新配置
  const newConfig: TelemetryConfig = {
    enabled: true,
    anonymousId: generateAnonymousId(),
    sessionStartDate: new Date().toISOString().split("T")[0],
  };

  writeFileSync(CONFIG_FILE, JSON.stringify(newConfig, null, 2));
  return newConfig;
}

function getConfig(): TelemetryConfig {
  if (!config) {
    config = initConfig();
  }
  return config;
}

function generateAnonymousId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  for (let i = 0; i < 16; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

// ============================================
// 事件记录
// ============================================

/**
 * 记录遥测事件
 */
export function trackEvent(event: Omit<TelemetryEvent, "timestamp">): void {
  const cfg = getConfig();

  if (!cfg.enabled) {
    return;
  }

  const fullEvent: TelemetryEvent = {
    ...event,
    timestamp: new Date().toISOString(),
  };

  // 验证事件
  const validated = telemetryEventSchema.safeParse(fullEvent);
  if (!validated.success) {
    log.warn(`遥测事件验证失败: ${validated.error.message}`, {
      operation: "telemetry",
    });
    return;
  }

  // 追加到事件日志
  try {
    mkdirSync(TELEMETRY_DIR, { recursive: true });
    appendFileSync(EVENTS_FILE, JSON.stringify(validated.data) + "\n");
  } catch (error) {
    log.warn(`记录遥测事件失败: ${error}`, { operation: "telemetry" });
  }
}

/**
 * 记录技能调用
 */
export function trackSkillUsage(
  skillName: string,
  options: {
    duration?: number;
    success?: boolean;
    metadata?: Record<string, unknown>;
  } = {}
): void {
  trackEvent({
    event: "skill_invoked",
    skill: skillName,
    ...options,
  });
}

/**
 * 记录代理调用
 */
export function trackAgentUsage(
  agentName: string,
  options: {
    duration?: number;
    success?: boolean;
    metadata?: Record<string, unknown>;
  } = {}
): void {
  trackEvent({
    event: "agent_invoked",
    agent: agentName,
    ...options,
  });
}

/**
 * 记录工具调用
 */
export function trackToolUsage(
  toolName: string,
  options: {
    duration?: number;
    success?: boolean;
    metadata?: Record<string, unknown>;
  } = {}
): void {
  trackEvent({
    event: "tool_invoked",
    tool: toolName,
    ...options,
  });
}

/**
 * 记录会话开始
 */
export function trackSessionStart(): void {
  trackEvent({
    event: "session_started",
    metadata: {
      version: process.env.npm_package_version || "unknown",
      platform: process.platform,
      nodeVersion: process.version,
    },
  });
}

/**
 * 记录会话结束
 */
export function trackSessionEnd(durationMs: number): void {
  trackEvent({
    event: "session_ended",
    duration: durationMs,
  });
}

// ============================================
// 统计分析
// ============================================

interface SkillStats {
  name: string;
  invocations: number;
  avgDuration: number;
  successRate: number;
}

interface ToolStats {
  name: string;
  invocations: number;
  avgDuration: number;
  successRate: number;
}

interface TelemetryStats {
  totalSessions: number;
  totalEvents: number;
  skills: SkillStats[];
  tools: ToolStats[];
  topSkills: string[];
  topTools: string[];
  period: {
    start: string;
    end: string;
  };
}

/**
 * 获取遥测统计
 */
export function getTelemetryStats(): TelemetryStats {
  const events = loadEvents();

  // 按技能分组
  const skillMap = new Map<
    string,
    { count: number; durations: number[]; successes: number }
  >();
  const toolMap = new Map<
    string,
    { count: number; durations: number[]; successes: number }
  >();

  let sessionCount = 0;

  for (const event of events) {
    if (event.event === "session_started") {
      sessionCount++;
    }

    if (event.skill) {
      const existing = skillMap.get(event.skill) || {
        count: 0,
        durations: [],
        successes: 0,
      };
      existing.count++;
      if (event.duration) existing.durations.push(event.duration);
      if (event.success) existing.successes++;
      skillMap.set(event.skill, existing);
    }

    if (event.tool) {
      const existing = toolMap.get(event.tool) || {
        count: 0,
        durations: [],
        successes: 0,
      };
      existing.count++;
      if (event.duration) existing.durations.push(event.duration);
      if (event.success) existing.successes++;
      toolMap.set(event.tool, existing);
    }
  }

  // 转换为统计格式
  const skills: SkillStats[] = Array.from(skillMap.entries())
    .map(([name, data]) => ({
      name,
      invocations: data.count,
      avgDuration:
        data.durations.length > 0
          ? data.durations.reduce((a, b) => a + b, 0) / data.durations.length
          : 0,
      successRate: data.count > 0 ? data.successes / data.count : 0,
    }))
    .sort((a, b) => b.invocations - a.invocations);

  const tools: ToolStats[] = Array.from(toolMap.entries())
    .map(([name, data]) => ({
      name,
      invocations: data.count,
      avgDuration:
        data.durations.length > 0
          ? data.durations.reduce((a, b) => a + b, 0) / data.durations.length
          : 0,
      successRate: data.count > 0 ? data.successes / data.count : 0,
    }))
    .sort((a, b) => b.invocations - a.invocations);

  return {
    totalSessions: sessionCount,
    totalEvents: events.length,
    skills,
    tools,
    topSkills: skills.slice(0, 5).map((s) => s.name),
    topTools: tools.slice(0, 5).map((t) => t.name),
    period: {
      start: events[0]?.timestamp || new Date().toISOString(),
      end: events[events.length - 1]?.timestamp || new Date().toISOString(),
    },
  };
}

/**
 * 加载事件日志
 */
function loadEvents(): TelemetryEvent[] {
  if (!existsSync(EVENTS_FILE)) {
    return [];
  }

  const events: TelemetryEvent[] = [];
  const content = readFileSync(EVENTS_FILE, "utf-8");

  for (const line of content.split("\n")) {
    if (!line.trim()) continue;

    try {
      const event = JSON.parse(line);
      events.push(event);
    } catch {
      // 跳过无效行
    }
  }

  return events;
}

/**
 * 保存统计到文件
 */
export function saveStats(): void {
  const stats = getTelemetryStats();
  writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2));
  log.info(`遥测统计已保存: ${STATS_FILE}`, { operation: "telemetry" });
}

// ============================================
// 配置控制
// ============================================

/**
 * 启用遥测
 */
export function enableTelemetry(): void {
  const cfg = getConfig();
  cfg.enabled = true;
  writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2));
  config = cfg;
  log.info("遥测已启用", { operation: "telemetry" });
}

/**
 * 禁用遥测
 */
export function disableTelemetry(): void {
  const cfg = getConfig();
  cfg.enabled = false;
  writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2));
  config = cfg;
  log.info("遥测已禁用", { operation: "telemetry" });
}

/**
 * 检查遥测是否启用
 */
export function isTelemetryEnabled(): boolean {
  return getConfig().enabled;
}

/**
 * 获取匿名 ID
 */
export function getAnonymousId(): string {
  return getConfig().anonymousId;
}

/**
 * 清除遥测数据
 */
export function clearTelemetryData(): void {
  try {
    if (existsSync(EVENTS_FILE)) {
      writeFileSync(EVENTS_FILE, "");
    }
    if (existsSync(STATS_FILE)) {
      writeFileSync(STATS_FILE, "{}");
    }
    log.info("遥测数据已清除", { operation: "telemetry" });
  } catch (error) {
    log.warn(`清除遥测数据失败: ${error}`, { operation: "telemetry" });
  }
}

// ============================================
// 导出格式化报告
// ============================================

/**
 * 生成遥测报告
 */
export function generateTelemetryReport(): string {
  const stats = getTelemetryStats();
  const lines: string[] = [
    "# ztl-coder 遥测报告",
    "",
    `**统计周期**: ${stats.period.start} ~ ${stats.period.end}`,
    `**总会话数**: ${stats.totalSessions}`,
    `**总事件数**: ${stats.totalEvents}`,
    "",
    "## 最常用技能",
    "",
    ...stats.topSkills.map((s, i) => `${i + 1}. ${s}`),
    "",
    "## 最常用工具",
    "",
    ...stats.topTools.map((t, i) => `${i + 1}. ${t}`),
    "",
    "## 技能详情",
    "",
    "| 技能 | 调用次数 | 平均耗时 | 成功率 |",
    "|------|----------|----------|--------|",
    ...stats.skills.map(
      (s) =>
        `| ${s.name} | ${s.invocations} | ${s.avgDuration.toFixed(0)}ms | ${(s.successRate * 100).toFixed(1)}% |`
    ),
    "",
    "## 工具详情",
    "",
    "| 工具 | 调用次数 | 平均耗时 | 成功率 |",
    "|------|----------|----------|--------|",
    ...stats.tools.map(
      (t) =>
        `| ${t.name} | ${t.invocations} | ${t.avgDuration.toFixed(0)}ms | ${(t.successRate * 100).toFixed(1)}% |`
    ),
  ];

  return lines.join("\n");
}
