/**
 * E2E 测试工具模块
 *
 * 提供浏览器自动化测试和错误收集功能
 */

export { createBrowserSessionManager } from "./browser-session.ts";
export type { BrowserSessionManager } from "./browser-session.ts";

export { createErrorCollector } from "./error-collector.ts";
export type { ErrorCollector } from "./error-collector.ts";

export {
  type BrowserType,
  type ErrorType,
  type ErrorSeverity,
  type CollectedError,
  type BrowserSessionConfig,
  type BrowserSessionState,
  type ErrorReport,
  type ErrorReportSummary,
  type TestScenario,
  type TestStep,
  type TestResult,
  DEFAULT_BROWSER_CONFIG,
} from "./types.ts";
