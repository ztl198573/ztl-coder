/**
 * 浏览器会话管理器
 *
 * 使用 Playwright 管理浏览器会话，收集错误
 */

import type {
  BrowserType,
  BrowserSessionConfig,
  BrowserSessionState,
  CollectedError,
  ErrorReport,
  ErrorSeverity,
  ErrorType,
  TestScenario,
  TestResult,
} from "./types.ts";
import { DEFAULT_BROWSER_CONFIG } from "./types.ts";

/** 生成唯一 ID */
function generateId(prefix: string = "id"): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * 创建浏览器会话管理器
 */
export function createBrowserSessionManager(config: Partial<BrowserSessionConfig> = {}) {
  const cfg: BrowserSessionConfig = { ...DEFAULT_BROWSER_CONFIG, ...config };
  const state: BrowserSessionState = {
    sessionId: generateId("session"),
    isRunning: false,
    errors: [],
    logs: [],
    requests: [],
  };

  // Playwright 实例（延迟加载）
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let playwright: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let browser: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let context: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let page: any = null;

  /** 加载 Playwright */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function loadPlaywright(): Promise<any> {
    if (!playwright) {
      try {
        // @ts-expect-error - playwright is an optional dependency
        playwright = await import("playwright");
      } catch {
        throw new Error("Playwright 未安装。请运行: bun add playwright && bunx playwright install");
      }
    }
    return playwright;
  }

  /** 检测项目浏览器配置 */
  async function detectBrowser(): Promise<BrowserType> {
    try {
      const packageJson = await Bun.file("package.json").json();
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

      if (deps["@playwright/test"]) {
        // 检查 playwright.config.ts
        try {
          const configContent = await Bun.file("playwright.config.ts").text();
          if (configContent.includes("firefox")) return "firefox";
          if (configContent.includes("webkit")) return "webkit";
        } catch {
          // 忽略配置文件不存在
        }
      }

      return cfg.browser;
    } catch {
      return cfg.browser;
    }
  }

  /** 启动浏览器会话 */
  async function start(baseURL?: string): Promise<string> {
    if (state.isRunning) {
      return state.sessionId;
    }

    const pw = await loadPlaywright();
    const browserType = await detectBrowser();

    // 启动浏览器
    browser = await pw[browserType].launch({
      headless: cfg.headless,
    });

    // 创建上下文
    context = await browser.newContext({
      viewport: {
        width: cfg.viewportWidth,
        height: cfg.viewportHeight,
      },
      baseURL: baseURL || cfg.baseURL,
    });

    // 创建页面
    page = await context.newPage();

    // 设置错误收集
    setupErrorCollection();

    state.isRunning = true;
    state.sessionId = generateId("session");

    return state.sessionId;
  }

  /** 设置错误收集 */
  function setupErrorCollection(): void {
    if (!page || !context) return;

    // Console 日志
    if (cfg.collectConsole) {
      page.on("console", (msg: { type: () => string; text: () => string; location: () => { url: string; line?: number; column?: number } }) => {
        const type = msg.type() as ErrorSeverity;
        if (type === "error" || type === "warning") {
          state.logs.push({
            type,
            message: msg.text(),
            timestamp: new Date(),
          });

          // 添加到错误列表
          if (type === "error") {
            addError({
              type: "console",
              severity: "error",
              message: msg.text(),
              location: msg.location(),
            });
          }
        }
      });
    }

    // 页面错误
    page.on("pageerror", (error: Error) => {
      addError({
        type: "pageerror",
        severity: "error",
        message: error.message,
        stack: error.stack,
      });
    });

    // 网络请求
    if (cfg.collectNetwork) {
      page.on("request", (request: { method: () => string; url: () => string }) => {
        state.requests.push({
          method: request.method(),
          url: request.url(),
          timestamp: new Date(),
        });
      });

      page.on("response", (response: { status: () => number; statusText: () => string; url: () => string }) => {
        const status = response.status();
        if (status >= 400) {
          addError({
            type: "network",
            severity: status >= 500 ? "error" : "warning",
            message: `HTTP ${status}: ${response.statusText()}`,
            location: { url: response.url() },
          });
        }
      });

      page.on("requestfailed", (request: { failure: () => { errorText: string } | null; url: () => string }) => {
        addError({
          type: "network",
          severity: "error",
          message: `请求失败: ${request.failure()?.errorText || "未知错误"}`,
          location: { url: request.url() },
        });
      });
    }
  }

  /** 添加错误 */
  function addError(partial: Partial<CollectedError>): void {
    const error: CollectedError = {
      id: generateId("err"),
      type: partial.type || "runtime",
      severity: partial.severity || "error",
      message: partial.message || "",
      timestamp: new Date(),
      ...partial,
    };
    state.errors.push(error);
  }

  /** 导航到页面 */
  async function navigate(url: string): Promise<void> {
    if (!page) throw new Error("浏览器会话未启动");

    await page.goto(url, {
      timeout: cfg.timeout,
      waitUntil: "networkidle",
    });

    state.currentUrl = url;
  }

  /** 点击元素 */
  async function click(selector: string): Promise<void> {
    if (!page) throw new Error("浏览器会话未启动");
    await page.click(selector, { timeout: cfg.timeout });
  }

  /** 填写表单 */
  async function fill(selector: string, value: string): Promise<void> {
    if (!page) throw new Error("浏览器会话未启动");
    await page.fill(selector, value, { timeout: cfg.timeout });
  }

  /** 等待元素 */
  async function waitFor(selector: string): Promise<void> {
    if (!page) throw new Error("浏览器会话未启动");
    await page.waitForSelector(selector, { timeout: cfg.timeout });
  }

  /** 截图 */
  async function screenshot(name?: string): Promise<string> {
    if (!page) throw new Error("浏览器会话未启动");

    const buffer = await page.screenshot({
      fullPage: true,
    });

    const base64 = buffer.toString("base64");

    // 保存到错误记录
    if (state.errors.length > 0) {
      state.errors[state.errors.length - 1].screenshot = base64;
    }

    return base64;
  }

  /** 执行自定义脚本 */
  async function evaluate<T>(script: string): Promise<T> {
    if (!page) throw new Error("浏览器会话未启动");
    return await page.evaluate(script);
  }

  /** 获取当前状态 */
  function getState(): BrowserSessionState {
    return { ...state };
  }

  /** 生成错误报告 */
  function generateReport(): ErrorReport {
    const summary = {
      total: state.errors.length,
      byType: {} as Record<ErrorType, number>,
      bySeverity: {} as Record<ErrorSeverity, number>,
    };

    // 统计
    for (const error of state.errors) {
      summary.byType[error.type] = (summary.byType[error.type] || 0) + 1;
      summary.bySeverity[error.severity] = (summary.bySeverity[error.severity] || 0) + 1;
    }

    // 生成建议
    const recommendations = generateRecommendations(state.errors);

    return {
      reportId: generateId("report"),
      timestamp: new Date(),
      browser: {
        type: cfg.browser,
        version: browser?.version() || "unknown",
      },
      url: state.currentUrl || "",
      summary,
      errors: state.errors,
      screenshots: state.errors
        .filter((e) => e.screenshot)
        .map((e) => e.screenshot!),
      recommendations,
    };
  }

  /** 生成修复建议 */
  function generateRecommendations(errors: CollectedError[]): string[] {
    const recommendations: string[] = [];

    for (const error of errors) {
      if (error.type === "console" && error.message.includes("undefined")) {
        recommendations.push(`检查 ${error.location?.url} 中的 undefined 值`);
      }
      if (error.type === "network" && error.severity === "error") {
        recommendations.push(`修复网络请求: ${error.location?.url}`);
      }
      if (error.type === "pageerror") {
        recommendations.push(`修复 JS 异常: ${error.message}`);
      }
    }

    return [...new Set(recommendations)];
  }

  /** 清除收集的数据 */
  function clear(): void {
    state.errors = [];
    state.logs = [];
    state.requests = [];
  }

  /** 关闭会话 */
  async function close(): Promise<void> {
    if (page) {
      await page.close();
      page = null;
    }
    if (context) {
      await context.close();
      context = null;
    }
    if (browser) {
      await browser.close();
      browser = null;
    }

    state.isRunning = false;
    state.currentUrl = undefined;
  }

  /** 执行测试场景 */
  async function runScenario(scenario: TestScenario): Promise<TestResult> {
    const startTime = Date.now();
    const stepResults: TestResult["stepResults"] = [];

    try {
      for (const step of scenario.steps) {
        const stepStart = Date.now();
        try {
          await executeStep(step);
          stepResults.push({
            stepId: step.id,
            passed: true,
            duration: Date.now() - stepStart,
          });
        } catch (error) {
          stepResults.push({
            stepId: step.id,
            passed: false,
            error: error instanceof Error ? error.message : String(error),
            duration: Date.now() - stepStart,
          });

          // 截图记录失败
          if (cfg.takeScreenshots && page) {
            await screenshot(`step-${step.id}-failed`);
          }
        }
      }

      const allPassed = stepResults.every((r) => r.passed);

      return {
        passed: allPassed,
        scenarioId: scenario.id,
        duration: Date.now() - startTime,
        errorReport: allPassed ? undefined : generateReport(),
        stepResults,
      };
    } catch (error) {
      return {
        passed: false,
        scenarioId: scenario.id,
        duration: Date.now() - startTime,
        errorReport: generateReport(),
        stepResults,
      };
    }
  }

  /** 执行单个步骤 */
  async function executeStep(step: import("./types.ts").TestStep): Promise<void> {
    if (!page) throw new Error("浏览器会话未启动");

    switch (step.type) {
      case "navigate":
        await navigate(step.params?.url as string);
        break;
      case "click":
        await click(step.params?.selector as string);
        break;
      case "fill":
        await fill(step.params?.selector as string, step.params?.value as string);
        break;
      case "wait":
        await waitFor(step.params?.selector as string);
        break;
      case "screenshot":
        await screenshot(step.params?.name as string);
        break;
      case "custom":
        if (step.script) {
          await evaluate(step.script);
        }
        break;
      default:
        throw new Error(`未知步骤类型: ${step.type}`);
    }
  }

  return {
    start,
    close,
    navigate,
    click,
    fill,
    waitFor,
    screenshot,
    evaluate,
    getState,
    generateReport,
    clear,
    runScenario,
    detectBrowser,
  };
}

export type BrowserSessionManager = ReturnType<typeof createBrowserSessionManager>;
