/**
 * 浏览器导航工具
 */

import { getCurrentPage } from "./manager.js";
import { log } from "@/utils/logger.js";

/**
 * 导航到 URL
 */
export async function goto(
  url: string,
  options?: {
    waitUntil?: "load" | "domcontentloaded" | "networkidle";
    timeout?: number;
  },
): Promise<{ success: boolean; url: string; title: string; message: string }> {
  const page = getCurrentPage();
  if (!page) {
    return { success: false, url: "", title: "", message: "浏览器未启动" };
  }

  try {
    await page.goto(url, {
      waitUntil: options?.waitUntil ?? "load",
      timeout: options?.timeout ?? 30000,
    });

    const title = await page.title();
    log.info("页面导航完成", { url, title });
    return { success: true, url, title, message: `已导航到: ${title}` };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error("导航失败", { url, error: errorMessage });
    return { success: false, url: "", title: "", message: `导航失败: ${errorMessage}` };
  }
}

/**
 * 后退
 */
export async function goBack(): Promise<{ success: boolean; message: string }> {
  const page = getCurrentPage();
  if (!page) {
    return { success: false, message: "浏览器未启动" };
  }

  try {
    await page.goBack();
    return { success: true, message: "已后退" };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, message: `后退失败: ${errorMessage}` };
  }
}

/**
 * 前进
 */
export async function goForward(): Promise<{ success: boolean; message: string }> {
  const page = getCurrentPage();
  if (!page) {
    return { success: false, message: "浏览器未启动" };
  }

  try {
    await page.goForward();
    return { success: true, message: "已前进" };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, message: `前进失败: ${errorMessage}` };
  }
}

/**
 * 刷新页面
 */
export async function reload(options?: {
  waitUntil?: "load" | "domcontentloaded" | "networkidle";
}): Promise<{ success: boolean; message: string }> {
  const page = getCurrentPage();
  if (!page) {
    return { success: false, message: "浏览器未启动" };
  }

  try {
    await page.reload({ waitUntil: options?.waitUntil ?? "load" });
    return { success: true, message: "页面已刷新" };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, message: `刷新失败: ${errorMessage}` };
  }
}

/**
 * 获取当前 URL
 */
export async function getCurrentUrl(): Promise<string> {
  const page = getCurrentPage();
  if (!page) {
    return "";
  }
  return page.url();
}

/**
 * 获取页面标题
 */
export async function getTitle(): Promise<string> {
  const page = getCurrentPage();
  if (!page) {
    return "";
  }
  return page.title();
}

/**
 * 设置视口大小
 */
export async function setViewport(
  width: number,
  height: number,
): Promise<{ success: boolean; message: string }> {
  const page = getCurrentPage();
  if (!page) {
    return { success: false, message: "浏览器未启动" };
  }

  try {
    await page.setViewportSize({ width, height });
    log.info("视口已设置", { width, height });
    return { success: true, message: `视口已设置为 ${width}x${height}` };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, message: `设置视口失败: ${errorMessage}` };
  }
}

/**
 * 设置移动端视口
 */
export async function setMobileViewport(): Promise<{ success: boolean; message: string }> {
  return setViewport(375, 812);
}

/**
 * 设置桌面视口
 */
export async function setDesktopViewport(): Promise<{ success: boolean; message: string }> {
  return setViewport(1920, 1080);
}

/**
 * 设置平板视口
 */
export async function setTabletViewport(): Promise<{ success: boolean; message: string }> {
  return setViewport(768, 1024);
}
