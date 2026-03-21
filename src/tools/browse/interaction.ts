/**
 * 浏览器交互工具
 */

import { getCurrentPage } from "./manager.js";
import { log } from "@/utils/logger.js";

// 类型定义
type Locator = import("playwright").Locator;

/**
 * 查找元素
 */
async function findElement(selector: string): Promise<Locator | null> {
  const page = getCurrentPage();
  if (!page) {
    return null;
  }
  return page.locator(selector).first();
}

/**
 * 点击元素
 */
export async function click(
  selector: string,
  options?: {
    timeout?: number;
    force?: boolean;
    doubleClick?: boolean;
  },
): Promise<{ success: boolean; message: string }> {
  const page = getCurrentPage();
  if (!page) {
    return { success: false, message: "浏览器未启动" };
  }

  try {
    const element = await findElement(selector);
    if (!element) {
      return { success: false, message: `未找到元素: ${selector}` };
    }

    if (options?.doubleClick) {
      await element.dblclick({ timeout: options.timeout ?? 5000, force: options.force });
    } else {
      await element.click({ timeout: options.timeout ?? 5000, force: options.force });
    }

    log.info("点击元素", { selector, doubleClick: options?.doubleClick });
    return { success: true, message: `已点击: ${selector}` };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error("点击失败", { selector, error: errorMessage });
    return { success: false, message: `点击失败: ${errorMessage}` };
  }
}

/**
 * 填写输入框
 */
export async function fill(
  selector: string,
  value: string,
  options?: {
    timeout?: number;
    clear?: boolean;
  },
): Promise<{ success: boolean; message: string }> {
  const page = getCurrentPage();
  if (!page) {
    return { success: false, message: "浏览器未启动" };
  }

  try {
    const element = await findElement(selector);
    if (!element) {
      return { success: false, message: `未找到元素: ${selector}` };
    }

    if (options?.clear !== false) {
      await element.clear();
    }

    await element.fill(value, { timeout: options?.timeout ?? 5000 });

    log.info("填写输入框", { selector, valueLength: value.length });
    return { success: true, message: `已填写: ${selector}` };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error("填写失败", { selector, error: errorMessage });
    return { success: false, message: `填写失败: ${errorMessage}` };
  }
}

/**
 * 选择下拉选项
 */
export async function select(
  selector: string,
  value: string,
): Promise<{ success: boolean; message: string }> {
  const page = getCurrentPage();
  if (!page) {
    return { success: false, message: "浏览器未启动" };
  }

  try {
    await page.selectOption(selector, value);
    log.info("选择选项", { selector, value });
    return { success: true, message: `已选择: ${value}` };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, message: `选择失败: ${errorMessage}` };
  }
}

/**
 * 勾选复选框
 */
export async function check(selector: string): Promise<{ success: boolean; message: string }> {
  const page = getCurrentPage();
  if (!page) {
    return { success: false, message: "浏览器未启动" };
  }

  try {
    await page.check(selector);
    log.info("勾选复选框", { selector });
    return { success: true, message: `已勾选: ${selector}` };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, message: `勾选失败: ${errorMessage}` };
  }
}

/**
 * 取消勾选复选框
 */
export async function uncheck(selector: string): Promise<{ success: boolean; message: string }> {
  const page = getCurrentPage();
  if (!page) {
    return { success: false, message: "浏览器未启动" };
  }

  try {
    await page.uncheck(selector);
    log.info("取消勾选复选框", { selector });
    return { success: true, message: `已取消勾选: ${selector}` };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, message: `取消勾选失败: ${errorMessage}` };
  }
}

/**
 * 悬停在元素上
 */
export async function hover(selector: string): Promise<{ success: boolean; message: string }> {
  const page = getCurrentPage();
  if (!page) {
    return { success: false, message: "浏览器未启动" };
  }

  try {
    await page.hover(selector);
    log.info("悬停在元素上", { selector });
    return { success: true, message: `已悬停: ${selector}` };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, message: `悬停失败: ${errorMessage}` };
  }
}

/**
 * 按下键盘
 */
export async function press(key: string): Promise<{ success: boolean; message: string }> {
  const page = getCurrentPage();
  if (!page) {
    return { success: false, message: "浏览器未启动" };
  }

  try {
    await page.keyboard.press(key);
    log.info("按下键盘", { key });
    return { success: true, message: `已按下: ${key}` };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, message: `按键失败: ${errorMessage}` };
  }
}

/**
 * 输入文本
 */
export async function type(text: string): Promise<{ success: boolean; message: string }> {
  const page = getCurrentPage();
  if (!page) {
    return { success: false, message: "浏览器未启动" };
  }

  try {
    await page.keyboard.type(text);
    log.info("输入文本", { textLength: text.length });
    return { success: true, message: `已输入 ${text.length} 个字符` };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, message: `输入失败: ${errorMessage}` };
  }
}

/**
 * 等待元素出现
 */
export async function waitForSelector(
  selector: string,
  options?: {
    timeout?: number;
    state?: "attached" | "detached" | "visible" | "hidden";
  },
): Promise<{ success: boolean; message: string }> {
  const page = getCurrentPage();
  if (!page) {
    return { success: false, message: "浏览器未启动" };
  }

  try {
    await page.waitForSelector(selector, {
      timeout: options?.timeout ?? 30000,
      state: options?.state ?? "visible",
    });
    log.info("元素已出现", { selector });
    return { success: true, message: `元素已出现: ${selector}` };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, message: `等待超时: ${errorMessage}` };
  }
}

/**
 * 等待文本出现
 */
export async function waitForText(
  text: string,
  options?: { timeout?: number },
): Promise<{ success: boolean; message: string }> {
  const page = getCurrentPage();
  if (!page) {
    return { success: false, message: "浏览器未启动" };
  }

  try {
    await page.waitForFunction(
      (searchText) => document.body.innerText.includes(searchText),
      text,
      { timeout: options?.timeout ?? 30000 },
    );
    log.info("文本已出现", { text });
    return { success: true, message: `文本已出现: ${text}` };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, message: `等待超时: ${errorMessage}` };
  }
}
