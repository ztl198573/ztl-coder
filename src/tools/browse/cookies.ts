/**
 * 浏览器 Cookie 管理工具
 */

import { getCurrentPage } from "./manager.js";
import { log } from "@/utils/logger.js";
import { writeFile, readFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

// Cookie 类型定义
type Cookie = import("playwright").Cookie;

// Cookie 存储目录
const COOKIE_DIR = join(process.cwd(), ".browse", "cookies");

/**
 * 确保 Cookie 目录存在
 */
async function ensureCookieDir(): Promise<void> {
  if (!existsSync(COOKIE_DIR)) {
    await mkdir(COOKIE_DIR, { recursive: true });
  }
}

/**
 * 获取浏览器上下文
 */
function getContext(): import("playwright").BrowserContext | null {
  const page = getCurrentPage();
  return page?.context() || null;
}

/**
 * 获取所有 Cookie
 */
export async function getCookies(): Promise<{
  success: boolean;
  cookies?: Cookie[];
  message: string;
}> {
  const context = getContext();
  if (!context) {
    return { success: false, message: "浏览器未启动" };
  }

  try {
    const cookies = await context.cookies();
    log.info("获取 Cookie", { count: cookies.length });
    return { success: true, cookies, message: `获取成功，共 ${cookies.length} 个 Cookie` };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, message: `获取失败: ${errorMessage}` };
  }
}

/**
 * 获取特定域名的 Cookie
 */
export async function getCookiesByDomain(
  domain: string,
): Promise<{ success: boolean; cookies?: Cookie[]; message: string }> {
  const context = getContext();
  if (!context) {
    return { success: false, message: "浏览器未启动" };
  }

  try {
    const allCookies = await context.cookies();
    const cookies = allCookies.filter((c) => c.domain.includes(domain));
    log.info("获取域名 Cookie", { domain, count: cookies.length });
    return { success: true, cookies, message: `获取成功，共 ${cookies.length} 个 Cookie` };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, message: `获取失败: ${errorMessage}` };
  }
}

/**
 * 设置 Cookie
 */
export async function setCookie(
  name: string,
  value: string,
  options?: {
    domain?: string;
    path?: string;
    expires?: number;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: "Strict" | "Lax" | "None";
  },
): Promise<{ success: boolean; message: string }> {
  const context = getContext();
  if (!context) {
    return { success: false, message: "浏览器未启动" };
  }

  try {
    await context.addCookies([
      {
        name,
        value,
        domain: options?.domain || ".",
        path: options?.path || "/",
        expires: options?.expires || -1,
        httpOnly: options?.httpOnly ?? false,
        secure: options?.secure ?? false,
        sameSite: options?.sameSite || "Lax",
      },
    ]);
    log.info("设置 Cookie", { name, domain: options?.domain });
    return { success: true, message: `Cookie '${name}' 已设置` };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, message: `设置失败: ${errorMessage}` };
  }
}

/**
 * 删除 Cookie
 */
export async function deleteCookie(name: string, domain?: string): Promise<{ success: boolean; message: string }> {
  const context = getContext();
  if (!context) {
    return { success: false, message: "浏览器未启动" };
  }

  try {
    await context.clearCookies({
      name,
      domain,
    });
    log.info("删除 Cookie", { name, domain });
    return { success: true, message: `Cookie '${name}' 已删除` };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, message: `删除失败: ${errorMessage}` };
  }
}

/**
 * 清除所有 Cookie
 */
export async function clearAllCookies(): Promise<{ success: boolean; message: string }> {
  const context = getContext();
  if (!context) {
    return { success: false, message: "浏览器未启动" };
  }

  try {
    await context.clearCookies();
    log.info("清除所有 Cookie");
    return { success: true, message: "所有 Cookie 已清除" };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, message: `清除失败: ${errorMessage}` };
  }
}

/**
 * 导出 Cookie 到文件
 */
export async function exportCookies(
  filename: string,
  domain?: string,
): Promise<{ success: boolean; path?: string; message: string }> {
  const context = getContext();
  if (!context) {
    return { success: false, message: "浏览器未启动" };
  }

  try {
    await ensureCookieDir();

    const cookies = await context.cookies();
    const filteredCookies = domain ? cookies.filter((c) => c.domain.includes(domain)) : cookies;

    const filepath = join(COOKIE_DIR, filename);
    await writeFile(filepath, JSON.stringify(filteredCookies, null, 2));

    log.info("导出 Cookie", { path: filepath, count: filteredCookies.length });
    return { success: true, path: filepath, message: `Cookie 已导出到: ${filepath}` };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, message: `导出失败: ${errorMessage}` };
  }
}

/**
 * 从文件导入 Cookie
 */
export async function importCookies(
  filename: string,
): Promise<{ success: boolean; count?: number; message: string }> {
  const context = getContext();
  if (!context) {
    return { success: false, message: "浏览器未启动" };
  }

  try {
    const filepath = join(COOKIE_DIR, filename);

    if (!existsSync(filepath)) {
      return { success: false, message: `文件不存在: ${filename}` };
    }

    const content = await readFile(filepath, "utf-8");
    const cookies: Cookie[] = JSON.parse(content);

    await context.addCookies(cookies);

    log.info("导入 Cookie", { count: cookies.length });
    return { success: true, count: cookies.length, message: `已导入 ${cookies.length} 个 Cookie` };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, message: `导入失败: ${errorMessage}` };
  }
}

/**
 * 获取 Netscape 格式的 Cookie（用于 curl/wget）
 */
export async function getNetscapeCookies(domain?: string): Promise<{
  success: boolean;
  content?: string;
  message: string;
}> {
  const context = getContext();
  if (!context) {
    return { success: false, message: "浏览器未启动" };
  }

  try {
    const cookies = await context.cookies();
    const filteredCookies = domain ? cookies.filter((c) => c.domain.includes(domain)) : cookies;

    const lines = filteredCookies.map(
      (c) =>
        `${c.httpOnly ? "#HttpOnly_" : ""}${c.domain}\t${c.path}\t${c.secure ? "TRUE" : "FALSE"}\t${c.expires}\t${c.name}\t${c.value}`,
    );

    const content = lines.join("\n");
    return { success: true, content, message: `生成成功，共 ${lines.length} 行` };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, message: `生成失败: ${errorMessage}` };
  }
}
