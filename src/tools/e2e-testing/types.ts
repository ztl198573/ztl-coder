/**
 * E2E 测试工具类型定义
 */

/** 浏览器类型 */
export type BrowserType = "chromium" | "firefox" | "webkit" | "unknown";

/** 错误类型 */
export type ErrorType = "console" | "network" | "runtime" | "pageerror";

/** 错误严重程度 */
export type ErrorSeverity = "error" | "warning";

/** 收集的错误 */
export interface CollectedError {
  /** 错误 ID */
  id: string;
  /** 错误类型 */
  type: ErrorType;
  /** 严重程度 */
  severity: ErrorSeverity;
  /** 错误消息 */
  message: string;
  /** 错误位置 */
  location?: {
    url: string;
    line?: number;
    column?: number;
  };
  /** 堆栈信息 */
  stack?: string;
  /** 时间戳 */
  timestamp: Date;
  /** 截图（base64） */
  screenshot?: string;
  /** 附加上下文 */
  context?: Record<string, unknown>;
}

/** 浏览器会话配置 */
export interface BrowserSessionConfig {
  /** 浏览器类型 */
  browser: BrowserType;
  /** 是否无头模式 */
  headless: boolean;
  /** 视口宽度 */
  viewportWidth: number;
  /** 视口高度 */
  viewportHeight: number;
  /** 超时时间（毫秒） */
  timeout: number;
  /** 基础 URL */
  baseURL?: string;
  /** 是否收集 console 日志 */
  collectConsole: boolean;
  /** 是否收集网络请求 */
  collectNetwork: boolean;
  /** 是否截图 */
  takeScreenshots: boolean;
}

/** 浏览器会话状态 */
export interface BrowserSessionState {
  /** 会话 ID */
  sessionId: string;
  /** 是否已启动 */
  isRunning: boolean;
  /** 当前页面 URL */
  currentUrl?: string;
  /** 收集的错误 */
  errors: CollectedError[];
  /** 收集的日志 */
  logs: Array<{
    type: string;
    message: string;
    timestamp: Date;
  }>;
  /** 网络请求 */
  requests: Array<{
    method: string;
    url: string;
    status?: number;
    error?: string;
    timestamp: Date;
  }>;
}

/** 错误报告摘要 */
export interface ErrorReportSummary {
  /** 总错误数 */
  total: number;
  /** 按类型统计 */
  byType: Record<ErrorType, number>;
  /** 按严重程度统计 */
  bySeverity: Record<ErrorSeverity, number>;
}

/** 错误报告 */
export interface ErrorReport {
  /** 报告 ID */
  reportId: string;
  /** 执行时间 */
  timestamp: Date;
  /** 浏览器信息 */
  browser: {
    type: BrowserType;
    version: string;
  };
  /** 测试的 URL */
  url: string;
  /** 摘要 */
  summary: ErrorReportSummary;
  /** 错误列表 */
  errors: CollectedError[];
  /** 截图列表 */
  screenshots: string[];
  /** 修复建议 */
  recommendations: string[];
}

/** 测试场景 */
export interface TestScenario {
  /** 场景 ID */
  id: string;
  /** 场景名称 */
  name: string;
  /** 场景描述 */
  description?: string;
  /** 测试步骤 */
  steps: TestStep[];
}

/** 测试步骤 */
export interface TestStep {
  /** 步骤 ID */
  id: string;
  /** 步骤类型 */
  type: "navigate" | "click" | "fill" | "wait" | "assert" | "screenshot" | "custom";
  /** 步骤描述 */
  description?: string;
  /** 步骤参数 */
  params?: Record<string, unknown>;
  /** 自定义脚本 */
  script?: string;
}

/** 测试结果 */
export interface TestResult {
  /** 是否通过 */
  passed: boolean;
  /** 场景 ID */
  scenarioId: string;
  /** 执行时间 */
  duration: number;
  /** 错误报告 */
  errorReport?: ErrorReport;
  /** 步骤结果 */
  stepResults: Array<{
    stepId: string;
    passed: boolean;
    error?: string;
    duration: number;
  }>;
}

/** 默认配置 */
export const DEFAULT_BROWSER_CONFIG: BrowserSessionConfig = {
  browser: "chromium",
  headless: true,
  viewportWidth: 1280,
  viewportHeight: 720,
  timeout: 30000,
  collectConsole: true,
  collectNetwork: true,
  takeScreenshots: true,
};
