/**
 * 浏览器快照和截图工具
 */

import { getCurrentPage } from "./manager.js";
import { log } from "@/utils/logger.js";
import { writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

// 截图存储目录
const SCREENSHOT_DIR = join(process.cwd(), ".browse", "screenshots");

/**
 * 确保截图目录存在
 */
async function ensureScreenshotDir(): Promise<void> {
  if (!existsSync(SCREENSHOT_DIR)) {
    await mkdir(SCREENSHOT_DIR, { recursive: true });
  }
}

interface PageSnapshot {
  url: string;
  title: string;
  text: string;
  links: Array<{ text: string; href: string }>;
  images: Array<{ alt: string; src: string }>;
  forms: Array<{
    action: string;
    method: string;
    fields: Array<{ name: string; type: string; label: string }>;
  }>;
  buttons: string[];
}

/**
 * 获取页面快照
 */
export async function getSnapshot(): Promise<{ success: boolean; snapshot?: PageSnapshot; message: string }> {
  const page = getCurrentPage();
  if (!page) {
    return { success: false, message: "浏览器未启动" };
  }

  try {
    const url = page.url();
    const title = await page.title();

    // 获取页面内容
    const snapshot = await page.evaluate(() => {
      // 提取链接
      const links = Array.from(document.querySelectorAll("a[href]")).map((a) => ({
        text: (a as HTMLAnchorElement).textContent?.trim() || "",
        href: (a as HTMLAnchorElement).getAttribute("href") || "",
      }));

      // 提取图片
      const images = Array.from(document.querySelectorAll("img")).map((img) => ({
        alt: (img as HTMLImageElement).alt || "",
        src: (img as HTMLImageElement).src || "",
      }));

      // 提取表单
      const forms = Array.from(document.querySelectorAll("form")).map((form) => ({
        action: (form as HTMLFormElement).action || "",
        method: (form as HTMLFormElement).method || "GET",
        fields: Array.from(form.querySelectorAll("input, select, textarea")).map((field) => {
          const el = field as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
          const label = el.labels?.[0]?.textContent?.trim() || "";
          return {
            name: el.name || "",
            type: (el as HTMLInputElement).type || "text",
            label,
          };
        }),
      }));

      // 提取按钮
      const buttons = Array.from(document.querySelectorAll("button, input[type='submit'], input[type='button']")).map(
        (btn) => btn.textContent?.trim() || (btn as HTMLInputElement).value || "",
      );

      return {
        text: document.body.innerText,
        links,
        images,
        forms,
        buttons,
      };
    });

    const result: PageSnapshot = {
      url,
      title,
      ...snapshot,
    };

    log.info("获取页面快照", { url, title });
    return { success: true, snapshot: result, message: "快照获取成功" };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error("获取快照失败", { error: errorMessage });
    return { success: false, message: `获取快照失败: ${errorMessage}` };
  }
}

/**
 * 截图
 */
export async function takeScreenshot(
  filename?: string,
  options?: {
    fullPage?: boolean;
    type?: "png" | "jpeg";
    quality?: number;
    selector?: string;
  },
): Promise<{ success: boolean; path?: string; message: string }> {
  const page = getCurrentPage();
  if (!page) {
    return { success: false, message: "浏览器未启动" };
  }

  try {
    await ensureScreenshotDir();

    const name = filename || `screenshot-${Date.now()}.${options?.type || "png"}`;
    const filepath = join(SCREENSHOT_DIR, name);

    const screenshotOptions = {
      path: filepath,
      fullPage: options?.fullPage ?? false,
      type: (options?.type || "png") as "png" | "jpeg",
      quality: options?.quality,
    };

    if (options?.selector) {
      const element = await page.locator(options.selector);
      await element.screenshot(screenshotOptions);
    } else {
      await page.screenshot(screenshotOptions);
    }

    log.info("截图已保存", { path: filepath });
    return { success: true, path: filepath, message: `截图已保存: ${filepath}` };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error("截图失败", { error: errorMessage });
    return { success: false, message: `截图失败: ${errorMessage}` };
  }
}

/**
 * 获取页面文本
 */
export async function getText(): Promise<{ success: boolean; text?: string; message: string }> {
  const page = getCurrentPage();
  if (!page) {
    return { success: false, message: "浏览器未启动" };
  }

  try {
    const text = await page.evaluate(() => document.body.innerText);
    log.info("获取页面文本", { length: text.length });
    return { success: true, text, message: `获取成功，共 ${text.length} 个字符` };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, message: `获取文本失败: ${errorMessage}` };
  }
}

/**
 * 获取页面 HTML
 */
export async function getHtml(): Promise<{ success: boolean; html?: string; message: string }> {
  const page = getCurrentPage();
  if (!page) {
    return { success: false, message: "浏览器未启动" };
  }

  try {
    const html = await page.content();
    log.info("获取页面 HTML", { length: html.length });
    return { success: true, html, message: `获取成功，共 ${html.length} 个字符` };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, message: `获取 HTML 失败: ${errorMessage}` };
  }
}

/**
 * 获取页面链接
 */
export async function getLinks(): Promise<{ success: boolean; links?: Array<{ text: string; href: string }>; message: string }> {
  const page = getCurrentPage();
  if (!page) {
    return { success: false, message: "浏览器未启动" };
  }

  try {
    const links = await page.evaluate(() =>
      Array.from(document.querySelectorAll("a[href]")).map((a) => ({
        text: (a as HTMLAnchorElement).textContent?.trim() || "",
        href: (a as HTMLAnchorElement).getAttribute("href") || "",
      })),
    );
    log.info("获取页面链接", { count: links.length });
    return { success: true, links, message: `获取成功，共 ${links.length} 个链接` };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, message: `获取链接失败: ${errorMessage}` };
  }
}

/**
 * 执行 JavaScript
 */
export async function evaluate<T>(
  script: string,
): Promise<{ success: boolean; result?: T; message: string }> {
  const page = getCurrentPage();
  if (!page) {
    return { success: false, message: "浏览器未启动" };
  }

  try {
    const result = await page.evaluate(script);
    log.info("执行脚本", { scriptLength: script.length });
    return { success: true, result: result as T, message: "执行成功" };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error("执行脚本失败", { error: errorMessage });
    return { success: false, message: `执行失败: ${errorMessage}` };
  }
}
