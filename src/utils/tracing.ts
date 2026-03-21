/**
 * 调用链追踪模块
 *
 * 提供统一的调用链追踪和日志系统，用于追踪跨代理、跨工具调用的上下文传递。
 */

import { log } from "./logger";

// ============================================
// 类型定义
// ============================================

/** 追踪上下文 */
export interface TraceContext {
  /** 追踪 ID */
  traceId: string;
  /** 父 Span ID */
  parentSpanId?: string;
  /** 当前 Span ID */
  spanId: string;
  /** 代理名称 */
  agent?: string;
  /** 工具名称 */
  tool?: string;
  /** 开始时间 */
  startTime: number;
}

/** Span 事件 */
export interface SpanEvent {
  /** 时间戳 */
  timestamp: string;
  /** 追踪 ID */
  traceId: string;
  /** Span ID */
  spanId: string;
  /** 父 Span ID */
  parentSpanId?: string;
  /** 代理名称 */
  agent?: string;
  /** 工具名称 */
  tool?: string;
  /** 事件类型 */
  event: "start" | "end" | "error";
  /** 消息 */
  message: string;
  /** 持续时间（毫秒） */
  duration?: number;
  /** 元数据 */
  metadata?: Record<string, unknown>;
}

// ============================================
// ID 生成
// ============================================

/** 生成追踪 ID */
export function generateTraceId(): string {
  return `trace_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/** 生成 Span ID */
export function generateSpanId(): string {
  return `span_${Math.random().toString(36).slice(2, 8)}`;
}

// ============================================
// 上下文管理
// ============================================

/** 当前活跃的追踪上下文 */
let activeContext: TraceContext | null = null;

/** 获取当前上下文 */
export function getActiveContext(): TraceContext | null {
  return activeContext;
}

/** 设置当前上下文 */
export function setActiveContext(ctx: TraceContext | null): void {
  activeContext = ctx;
}

/** 创建根上下文 */
export function createRootContext(agent: string): TraceContext {
  const ctx: TraceContext = {
    traceId: generateTraceId(),
    spanId: generateSpanId(),
    agent,
    startTime: Date.now(),
  };
  setActiveContext(ctx);
  logSpan(ctx, "start", `根 Span 开始: ${agent}`);
  return ctx;
}

/** 创建子上下文 */
export function createChildContext(
  parent: TraceContext,
  options: { agent?: string; tool?: string } = {}
): TraceContext {
  const ctx: TraceContext = {
    traceId: parent.traceId,
    parentSpanId: parent.spanId,
    spanId: generateSpanId(),
    agent: options.agent,
    tool: options.tool,
    startTime: Date.now(),
  };
  logSpan(ctx, "start", `子 Span 开始: ${options.agent || options.tool || "unknown"}`);
  return ctx;
}

// ============================================
// Span 记录
// ============================================

/** 记录 Span 事件 */
export function logSpan(
  ctx: TraceContext,
  event: "start" | "end" | "error",
  message: string,
  metadata?: Record<string, unknown>
): void {
  const duration = event === "end" || event === "error" ? Date.now() - ctx.startTime : undefined;

  const spanEvent: SpanEvent = {
    timestamp: new Date().toISOString(),
    traceId: ctx.traceId,
    spanId: ctx.spanId,
    parentSpanId: ctx.parentSpanId,
    agent: ctx.agent,
    tool: ctx.tool,
    event,
    message,
    duration,
    metadata,
  };

  log.info(message, {
    operation: "tracing",
    data: spanEvent,
  });
}

/** 结束 Span */
export function endSpan(ctx: TraceContext, message?: string): number {
  const duration = Date.now() - ctx.startTime;
  logSpan(ctx, "end", message || "Span 结束", { duration });
  return duration;
}

/** 记录 Span 错误 */
export function spanError(ctx: TraceContext, error: Error | string): void {
  const errorMessage = error instanceof Error ? error.message : error;
  const errorStack = error instanceof Error ? error.stack : undefined;
  logSpan(ctx, "error", `Span 错误: ${errorMessage}`, { error: errorMessage, stack: errorStack });
}

// ============================================
// 便捷方法
// ============================================

/** 使用追踪上下文执行函数 */
export async function withTrace<T>(
  agent: string,
  fn: (ctx: TraceContext) => Promise<T>
): Promise<T> {
  const ctx = createRootContext(agent);
  try {
    const result = await fn(ctx);
    endSpan(ctx);
    return result;
  } catch (error) {
    spanError(ctx, error instanceof Error ? error : String(error));
    throw error;
  }
}

/** 在现有上下文中创建子 Span 并执行函数 */
export async function withChildSpan<T>(
  options: { agent?: string; tool?: string },
  fn: (ctx: TraceContext) => Promise<T>
): Promise<T> {
  const parent = getActiveContext();
  if (!parent) {
    // 如果没有父上下文，创建根上下文
    return withTrace(options.agent || options.tool || "unknown", fn);
  }

  const ctx = createChildContext(parent, options);
  const previousContext = getActiveContext();
  setActiveContext(ctx);

  try {
    const result = await fn(ctx);
    endSpan(ctx);
    return result;
  } catch (error) {
    spanError(ctx, error instanceof Error ? error : String(error));
    throw error;
  } finally {
    setActiveContext(previousContext);
  }
}

// ============================================
// 格式化输出
// ============================================

/** 格式化追踪上下文为可读字符串 */
export function formatTraceContext(ctx: TraceContext): string {
  const lines: string[] = [
    "## 追踪上下文",
    "",
    `**追踪 ID**: ${ctx.traceId}`,
    `**Span ID**: ${ctx.spanId}`,
  ];

  if (ctx.parentSpanId) {
    lines.push(`**父 Span ID**: ${ctx.parentSpanId}`);
  }

  if (ctx.agent) {
    lines.push(`**代理**: ${ctx.agent}`);
  }

  if (ctx.tool) {
    lines.push(`**工具**: ${ctx.tool}`);
  }

  const duration = Date.now() - ctx.startTime;
  lines.push(`**已持续时间**: ${duration}ms`);

  return lines.join("\n");
}

/** 生成追踪报告 */
export function generateTraceReport(ctx: TraceContext): string {
  const duration = Date.now() - ctx.startTime;

  return [
    "# 调用链追踪报告",
    "",
    `**追踪 ID**: ${ctx.traceId}`,
    `**Span ID**: ${ctx.spanId}`,
    ctx.parentSpanId ? `**父 Span ID**: ${ctx.parentSpanId}` : "",
    ctx.agent ? `**代理**: ${ctx.agent}` : "",
    ctx.tool ? `**工具**: ${ctx.tool}` : "",
    `**总持续时间**: ${duration}ms`,
    "",
    "---",
    "",
    "*此报告由 ztl-coder 追踪系统生成*",
  ]
    .filter(Boolean)
    .join("\n");
}
