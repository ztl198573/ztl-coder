/**
 * 浏览器网络监控工具
 */

import { getCurrentPage } from "./manager.js";
import { log } from "@/utils/logger.js";

// 类型定义
type Page = import("playwright").Page;
type Request = import("playwright").Request;
type Response = import("playwright").Response;

interface NetworkRequest {
  id: string;
  url: string;
  method: string;
  resourceType: string;
  status?: number;
  statusText?: string;
  requestHeaders: Record<string, string>;
  responseHeaders?: Record<string, string>;
  timing?: {
    dns?: number;
    connect?: number;
    ssl?: number;
    send?: number;
    wait?: number;
    receive?: number;
    total?: number;
  };
  error?: string;
}

interface ConsoleMessage {
  type: "log" | "warn" | "error" | "info" | "debug";
  text: string;
  timestamp: Date;
  location?: {
    url: string;
    lineNumber: number;
    columnNumber: number;
  };
}

// 存储网络请求和控制台消息
const networkRequests: NetworkRequest[] = [];
const consoleMessages: ConsoleMessage[] = [];

// 请求 ID 映射
const requestMap = new Map<string, NetworkRequest>();

/**
 * 初始化网络监控
 */
export function initNetworkMonitoring(page: Page): void {
  // 清空之前的记录
  networkRequests.length = 0;
  consoleMessages.length = 0;
  requestMap.clear();

  // 监听请求开始
  page.on("request", (request: Request) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const networkRequest: NetworkRequest = {
      id,
      url: request.url(),
      method: request.method(),
      resourceType: request.resourceType(),
      requestHeaders: request.headers(),
    };
    requestMap.set(request.url(), networkRequest);
    networkRequests.push(networkRequest);
  });

  // 监听响应
  page.on("response", (response: Response) => {
    const request = response.request();
    const networkRequest = requestMap.get(request.url());
    if (networkRequest) {
      networkRequest.status = response.status();
      networkRequest.statusText = response.statusText();
      networkRequest.responseHeaders = response.headers();

      // 获取 timing 信息
      const timing = response.timing();
      if (timing) {
        networkRequest.timing = {
          dns: timing.dnsEnd - timing.dnsStart,
          connect: timing.connectEnd - timing.connectStart,
          ssl: timing.sslEnd - timing.sslStart,
          send: timing.sendEnd - timing.sendStart,
          wait: timing.receiveStart - timing.sendEnd,
          receive: timing.receiveEnd - timing.receiveStart,
          total: timing.receiveEnd - timing.startTime,
        };
      }
    }
  });

  // 监听请求失败
  page.on("requestfailed", (request: Request) => {
    const networkRequest = requestMap.get(request.url());
    if (networkRequest) {
      networkRequest.error = request.failure()?.errorText || "Unknown error";
    }
  });

  // 监听控制台消息
  page.on("console", (msg) => {
    const type = msg.type() as ConsoleMessage["type"];
    if (["log", "warn", "error", "info", "debug"].includes(type)) {
      consoleMessages.push({
        type,
        text: msg.text(),
        timestamp: new Date(),
        location: msg.location()
          ? {
              url: msg.location().url || "",
              lineNumber: msg.location().lineNumber || 0,
              columnNumber: msg.location().columnNumber || 0,
            }
          : undefined,
      });
    }
  });

  // 监听页面错误
  page.on("pageerror", (error) => {
    consoleMessages.push({
      type: "error",
      text: error.message,
      timestamp: new Date(),
    });
  });

  log.info("网络监控已初始化");
}

/**
 * 获取网络请求列表
 */
export async function getNetworkRequests(options?: {
  resourceType?: string;
  status?: number;
  urlPattern?: string;
  limit?: number;
}): Promise<{ success: boolean; requests?: NetworkRequest[]; message: string }> {
  const page = getCurrentPage();
  if (!page) {
    return { success: false, message: "浏览器未启动" };
  }

  try {
    let filtered = [...networkRequests];

    if (options?.resourceType) {
      filtered = filtered.filter((r) => r.resourceType === options.resourceType);
    }

    if (options?.status) {
      filtered = filtered.filter((r) => r.status === options.status);
    }

    if (options?.urlPattern) {
      const pattern = new RegExp(options.urlPattern, "i");
      filtered = filtered.filter((r) => pattern.test(r.url));
    }

    if (options?.limit) {
      filtered = filtered.slice(-options.limit);
    }

    return {
      success: true,
      requests: filtered,
      message: `获取成功，共 ${filtered.length} 个请求`,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, message: `获取失败: ${errorMessage}` };
  }
}

/**
 * 获取控制台消息
 */
export async function getConsoleMessages(options?: {
  type?: ConsoleMessage["type"];
  limit?: number;
}): Promise<{ success: boolean; messages?: ConsoleMessage[]; message: string }> {
  const page = getCurrentPage();
  if (!page) {
    return { success: false, message: "浏览器未启动" };
  }

  try {
    let filtered = [...consoleMessages];

    if (options?.type) {
      filtered = filtered.filter((m) => m.type === options.type);
    }

    if (options?.limit) {
      filtered = filtered.slice(-options.limit);
    }

    return {
      success: true,
      messages: filtered,
      message: `获取成功，共 ${filtered.length} 条消息`,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, message: `获取失败: ${errorMessage}` };
  }
}

/**
 * 获取错误消息
 */
export async function getErrors(): Promise<{ success: boolean; errors?: ConsoleMessage[]; message: string }> {
  return getConsoleMessages({ type: "error" });
}

/**
 * 清除网络记录
 */
export function clearNetworkRecords(): void {
  networkRequests.length = 0;
  requestMap.clear();
  log.info("网络记录已清除");
}

/**
 * 清除控制台记录
 */
export function clearConsoleRecords(): void {
  consoleMessages.length = 0;
  log.info("控制台记录已清除");
}

/**
 * 获取网络统计
 */
export async function getNetworkStats(): Promise<{
  success: boolean;
  stats?: {
    totalRequests: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
    failedRequests: number;
    avgResponseTime?: number;
  };
  message: string;
}> {
  const page = getCurrentPage();
  if (!page) {
    return { success: false, message: "浏览器未启动" };
  }

  try {
    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    let failedCount = 0;
    let totalTime = 0;
    let timingCount = 0;

    for (const request of networkRequests) {
      // 按类型统计
      byType[request.resourceType] = (byType[request.resourceType] || 0) + 1;

      // 按状态统计
      if (request.status) {
        const statusGroup = `${Math.floor(request.status / 100)}xx`;
        byStatus[statusGroup] = (byStatus[statusGroup] || 0) + 1;
      }

      // 失败计数
      if (request.error || (request.status && request.status >= 400)) {
        failedCount++;
      }

      // 计算平均响应时间
      if (request.timing?.total) {
        totalTime += request.timing.total;
        timingCount++;
      }
    }

    return {
      success: true,
      stats: {
        totalRequests: networkRequests.length,
        byType,
        byStatus,
        failedRequests: failedCount,
        avgResponseTime: timingCount > 0 ? totalTime / timingCount : undefined,
      },
      message: "统计成功",
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, message: `统计失败: ${errorMessage}` };
  }
}
