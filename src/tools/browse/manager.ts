/**
 * 浏览器会话管理器
 * 管理持久化的浏览器会话
 *
 * 注意：playwright 是可选依赖，如果没有安装，浏览器功能将不可用
 */

import { log } from "@/utils/logger.js";
import { writeFile, readFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

// 类型定义（避免直接导入 playwright）
type Browser = import("playwright").Browser;
type BrowserContext = import("playwright").BrowserContext;
type Page = import("playwright").Page;

interface SessionData {
  id: string;
  createdAt: Date;
  lastAccessedAt: Date;
  cookies: Array<{
    name: string;
    value: string;
    domain: string;
    path: string;
  }>;
  localStorage: Record<string, string>;
  url: string;
}

interface BrowseSession {
  browser: Browser | null;
  context: BrowserContext | null;
  page: Page | null;
  sessionId: string | null;
}

// 全局浏览器会话
let currentSession: BrowseSession = {
  browser: null,
  context: null,
  page: null,
  sessionId: null,
};

// 会话存储目录
const SESSION_DIR = join(process.cwd(), ".browse", "sessions");

// playwright 是否可用
let playwrightAvailable: boolean | null = null;

/**
 * 检查 playwright 是否可用
 */
async function checkPlaywrightAvailable(): Promise<boolean> {
  if (playwrightAvailable !== null) {
    return playwrightAvailable;
  }

  try {
    await import("playwright");
    playwrightAvailable = true;
    return true;
  } catch {
    playwrightAvailable = false;
    log.warn("playwright 未安装，浏览器功能不可用。运行 'npm install playwright' 启用此功能");
    return false;
  }
}

/**
 * 确保 playwright 可用，否则抛出错误
 */
async function requirePlaywright(): Promise<typeof import("playwright")> {
  const available = await checkPlaywrightAvailable();
  if (!available) {
    throw new Error("playwright 未安装。请运行 'npm install playwright' 安装后重试");
  }
  return import("playwright");
}

/**
 * 确保会话目录存在
 */
async function ensureSessionDir(): Promise<void> {
  if (!existsSync(SESSION_DIR)) {
    await mkdir(SESSION_DIR, { recursive: true });
  }
}

/**
 * 启动浏览器
 */
export async function startBrowser(options?: {
  headless?: boolean;
  viewport?: { width: number; height: number };
  locale?: string;
  timezone?: string;
}): Promise<{ success: boolean; message: string }> {
  try {
    if (currentSession.browser) {
      return { success: true, message: "浏览器已在运行中" };
    }

    const playwright = await requirePlaywright();

    currentSession.browser = await playwright.chromium.launch({
      headless: options?.headless ?? true,
    });

    currentSession.context = await currentSession.browser.newContext({
      viewport: options?.viewport ?? { width: 1280, height: 720 },
      locale: options?.locale ?? "zh-CN",
      timezoneId: options?.timezone ?? "Asia/Shanghai",
    });

    currentSession.page = await currentSession.context.newPage();

    log.info("浏览器已启动", { headless: options?.headless ?? true });
    return { success: true, message: "浏览器启动成功" };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error("启动浏览器失败", { error: errorMessage });
    return { success: false, message: `启动失败: ${errorMessage}` };
  }
}

/**
 * 关闭浏览器
 */
export async function closeBrowser(): Promise<{ success: boolean; message: string }> {
  try {
    if (!currentSession.browser) {
      return { success: true, message: "浏览器未运行" };
    }

    await currentSession.browser.close();
    currentSession = {
      browser: null,
      context: null,
      page: null,
      sessionId: null,
    };

    log.info("浏览器已关闭");
    return { success: true, message: "浏览器已关闭" };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error("关闭浏览器失败", { error: errorMessage });
    return { success: false, message: `关闭失败: ${errorMessage}` };
  }
}

/**
 * 获取当前页面
 */
export function getCurrentPage(): Page | null {
  return currentSession.page;
}

/**
 * 检查浏览器是否运行中
 */
export function isBrowserRunning(): boolean {
  return currentSession.browser !== null && currentSession.page !== null;
}

/**
 * 检查浏览器功能是否可用
 */
export async function isBrowserAvailable(): Promise<boolean> {
  return checkPlaywrightAvailable();
}

/**
 * 保存会话
 */
export async function saveSession(name: string): Promise<{ success: boolean; message: string }> {
  try {
    if (!currentSession.context || !currentSession.page) {
      return { success: false, message: "浏览器未运行" };
    }

    await ensureSessionDir();

    const cookies = await currentSession.context.cookies();
    const url = currentSession.page.url();

    // 获取 localStorage
    const localStorage = await currentSession.page.evaluate(() => {
      const items: Record<string, string> = {};
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key) {
          items[key] = window.localStorage.getItem(key) || "";
        }
      }
      return items;
    });

    const sessionData: SessionData = {
      id: name,
      createdAt: new Date(),
      lastAccessedAt: new Date(),
      cookies: cookies.map((c) => ({
        name: c.name,
        value: c.value,
        domain: c.domain,
        path: c.path,
      })),
      localStorage,
      url,
    };

    const sessionFile = join(SESSION_DIR, `${name}.json`);
    await writeFile(sessionFile, JSON.stringify(sessionData, null, 2));

    currentSession.sessionId = name;
    log.info("会话已保存", { name });
    return { success: true, message: `会话 '${name}' 已保存` };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error("保存会话失败", { error: errorMessage });
    return { success: false, message: `保存失败: ${errorMessage}` };
  }
}

/**
 * 加载会话
 */
export async function loadSession(name: string): Promise<{ success: boolean; message: string }> {
  try {
    const sessionFile = join(SESSION_DIR, `${name}.json`);

    if (!existsSync(sessionFile)) {
      return { success: false, message: `会话 '${name}' 不存在` };
    }

    const content = await readFile(sessionFile, "utf-8");
    const sessionData: SessionData = JSON.parse(content);

    // 确保浏览器运行
    if (!currentSession.browser) {
      await startBrowser();
    }

    if (!currentSession.context) {
      return { success: false, message: "浏览器上下文未初始化" };
    }

    // 恢复 cookies
    await currentSession.context.addCookies(sessionData.cookies);

    // 导航到之前的 URL
    if (currentSession.page && sessionData.url) {
      await currentSession.page.goto(sessionData.url);
    }

    // 恢复 localStorage
    if (currentSession.page && Object.keys(sessionData.localStorage).length > 0) {
      await currentSession.page.evaluate((items) => {
        for (const [key, value] of Object.entries(items)) {
          window.localStorage.setItem(key, value);
        }
      }, sessionData.localStorage);
    }

    currentSession.sessionId = name;
    log.info("会话已加载", { name });
    return { success: true, message: `会话 '${name}' 已加载` };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error("加载会话失败", { error: errorMessage });
    return { success: false, message: `加载失败: ${errorMessage}` };
  }
}

/**
 * 列出所有会话
 */
export async function listSessions(): Promise<string[]> {
  try {
    await ensureSessionDir();

    const files = await import("node:fs/promises").then((fs) =>
      fs.readdir(SESSION_DIR)
    );
    return files
      .filter((f: string) => f.endsWith(".json"))
      .map((f: string) => f.replace(".json", ""));
  } catch {
    return [];
  }
}

/**
 * 删除会话
 */
export async function deleteSession(name: string): Promise<{ success: boolean; message: string }> {
  try {
    const sessionFile = join(SESSION_DIR, `${name}.json`);

    if (!existsSync(sessionFile)) {
      return { success: false, message: `会话 '${name}' 不存在` };
    }

    await import("node:fs/promises").then((fs) => fs.unlink(sessionFile));

    log.info("会话已删除", { name });
    return { success: true, message: `会话 '${name}' 已删除` };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error("删除会话失败", { error: errorMessage });
    return { success: false, message: `删除失败: ${errorMessage}` };
  }
}

/**
 * 获取当前会话 ID
 */
export function getCurrentSessionId(): string | null {
  return currentSession.sessionId;
}
