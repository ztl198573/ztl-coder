/**
 * 输出格式化模块
 *
 * 提供统一的输出格式、颜色支持和可读性优化
 */

/** ANSI 颜色代码 */
const ANSI = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  italic: "\x1b[3m",
  underline: "\x1b[4m",
  blink: "\x1b[5m",
  reverse: "\x1b[7m",
  hidden: "\x1b[8m",

  // 前景色
  black: "\x1b[30m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",

  // 背景色
  bgBlack: "\x1b[40m",
  bgRed: "\x1b[41m",
  bgGreen: "\x1b[42m",
  bgYellow: "\x1b[43m",
  bgBlue: "\x1b[44m",
  bgMagenta: "\x1b[45m",
  bgCyan: "\x1b[46m",
  bgWhite: "\x1b[47m",

  // 亮色
  brightBlack: "\x1b[90m",
  brightRed: "\x1b[91m",
  brightGreen: "\x1b[92m",
  brightYellow: "\x1b[93m",
  brightBlue: "\x1b[94m",
  brightMagenta: "\x1b[95m",
  brightCyan: "\x1b[96m",
  brightWhite: "\x1b[97m",
} as const;

/** 颜色名称 */
export type ColorName = keyof typeof ANSI;

/** 输出样式配置 */
export interface OutputStyle {
  /** 是否启用颜色 */
  color: boolean;
  /** 是否启用图标 */
  icons: boolean;
  /** 时间戳格式 */
  timestamp: boolean;
  /** 缩进大小 */
  indent: number;
  /** 最大行宽 */
  maxWidth: number;
}

/** 默认样式 */
const DEFAULT_STYLE: OutputStyle = {
  color: true,
  icons: true,
  timestamp: false,
  indent: 2,
  maxWidth: 120,
};

/** 输出格式化器 */
export class OutputFormatter {
  private style: OutputStyle;

  constructor(style: Partial<OutputStyle> = {}) {
    this.style = { ...DEFAULT_STYLE, ...style };
  }

  /** 应用颜色 */
  color(text: string, colorName: ColorName): string {
    if (!this.style.color) return text;
    return `${ANSI[colorName]}${text}${ANSI.reset}`;
  }

  /** 应用多个样式 */
  style(text: string, ...styles: ColorName[]): string {
    if (!this.style.color) return text;
    const codes = styles.map((s) => ANSI[s]).join("");
    return `${codes}${text}${ANSI.reset}`;
  }

  /** 加粗 */
  bold(text: string): string {
    return this.style(text, "bold");
  }

  /** 变暗 */
  dim(text: string): string {
    return this.style(text, "dim");
  }

  /** 斜体 */
  italic(text: string): string {
    return this.style(text, "italic");
  }

  /** 下划线 */
  underline(text: string): string {
    return this.style(text, "underline");
  }

  // 语义化颜色方法

  /** 成功消息 */
  success(text: string): string {
    const icon = this.style.icons ? "✓ " : "";
    return this.color(`${icon}${text}`, "green");
  }

  /** 错误消息 */
  error(text: string): string {
    const icon = this.style.icons ? "✗ " : "";
    return this.color(`${icon}${text}`, "red");
  }

  /** 警告消息 */
  warning(text: string): string {
    const icon = this.style.icons ? "⚠ " : "";
    return this.color(`${icon}${text}`, "yellow");
  }

  /** 信息消息 */
  info(text: string): string {
    const icon = this.style.icons ? "ℹ " : "";
    return this.color(`${icon}${text}`, "blue");
  }

  /** 调试消息 */
  debug(text: string): string {
    const icon = this.style.icons ? "◇ " : "";
    return this.dim(`${icon}${text}`);
  }

  /** 高亮文本 */
  highlight(text: string): string {
    return this.color(text, "cyan");
  }

  /** 路径格式化 */
  path(filePath: string): string {
    return this.color(filePath, "brightBlue");
  }

  /** 代码格式化 */
  code(code: string): string {
    return this.color(code, "brightYellow");
  }

  /** 数字格式化 */
  number(num: number): string {
    return this.color(String(num), "brightGreen");
  }

  /** 时间戳格式化 */
  timestamp(date: Date = new Date()): string {
    if (!this.style.timestamp) return "";
    const str = date.toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    return this.dim(`[${str}] `);
  }

  // 结构化输出

  /** 标题 */
  title(text: string, level: 1 | 2 | 3 = 1): string {
    const prefix = level === 1 ? "■ " : level === 2 ? "□ " : "○ ";
    const styled = level === 1 ? this.bold(text) : level === 2 ? this.underline(text) : text;
    return this.style.icons ? `${prefix}${styled}` : styled;
  }

  /** 列表项 */
  listItem(text: string, indent: number = 0): string {
    const prefix = "  ".repeat(indent) + (this.style.icons ? "• " : "- ");
    return `${prefix}${text}`;
  }

  /** 复选框项 */
  checkbox(text: string, checked: boolean, indent: number = 0): string {
    const prefix = "  ".repeat(indent);
    const box = checked ? (this.style.icons ? "☑ " : "[x] ") : (this.style.icons ? "☐ " : "[ ] ");
    return `${prefix}${box}${text}`;
  }

  /** 键值对 */
  keyValue(key: string, value: string): string {
    return `${this.dim(key)}: ${value}`;
  }

  /** 表格行 */
  tableRow(columns: string[], widths: number[]): string {
    const cells = columns.map((col, i) => {
      const width = widths[i] || 10;
      return col.padEnd(width);
    });
    return cells.join(" │ ");
  }

  /** 表格分隔线 */
  tableDivider(widths: number[]): string {
    const lines = widths.map((w) => "─".repeat(w));
    return lines.join("─┼─");
  }

  /** 进度条 */
  progressBar(current: number, total: number, width: number = 30): string {
    const percent = Math.min(100, Math.max(0, (current / total) * 100));
    const filled = Math.round((width * current) / total);
    const empty = width - filled;

    const bar = "█".repeat(filled) + "░".repeat(empty);
    const percentStr = `${percent.toFixed(1)}%`.padStart(6);

    return `[${this.color(bar, "green")}] ${this.bold(percentStr)}`;
  }

  /** 旋转器 */
  spinner(frame: number): string {
    const frames = this.style.icons ? ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"] : ["|", "/", "─", "\\"];
    return this.color(frames[frame % frames.length], "cyan");
  }

  /** 状态徽章 */
  badge(text: string, type: "success" | "error" | "warning" | "info"): string {
    const colors: Record<string, ColorName> = {
      success: "green",
      error: "red",
      warning: "yellow",
      info: "blue",
    };
    return this.color(` ${text} `, colors[type]);
  }

  // 格式化辅助方法

  /** 缩进文本 */
  indent(text: string, count: number = 1): string {
    const spaces = "  ".repeat(count);
    return text
      .split("\n")
      .map((line) => spaces + line)
      .join("\n");
  }

  /** 自动换行 */
  wrap(text: string, width?: number): string {
    const maxWidth = width || this.style.maxWidth;
    const words = text.split(" ");
    const lines: string[] = [];
    let currentLine = "";

    for (const word of words) {
      if (currentLine.length + word.length + 1 > maxWidth) {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = currentLine ? `${currentLine} ${word}` : word;
      }
    }
    if (currentLine) lines.push(currentLine);

    return lines.join("\n");
  }

  /** 截断文本 */
  truncate(text: string, maxLength: number, suffix: string = "…"): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - suffix.length) + suffix;
  }

  /** 清除 ANSI 代码 */
  static stripAnsi(text: string): string {
    // eslint-disable-next-line no-control-regex
    return text.replace(/\x1b\[[0-9;]*m/g, "");
  }

  /** 获取文本实际长度（不含 ANSI 代码） */
  static visibleLength(text: string): number {
    return OutputFormatter.stripAnsi(text).length;
  }
}

/** 默认格式化器实例 */
export const output = new OutputFormatter();

/** 创建自定义格式化器 */
export function createFormatter(style: Partial<OutputStyle> = {}): OutputFormatter {
  return new OutputFormatter(style);
}

/** 格式化字节数 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return "0 B";

  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

/** 格式化持续时间 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.round((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.round((ms % 3600000) / 60000);
  return `${hours}h ${minutes}m`;
}

/** 格式化相对时间 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const absDiff = Math.abs(diff);

  const minute = 60000;
  const hour = 3600000;
  const day = 86400000;
  const week = 604800000;
  const month = 2592000000;
  const year = 31536000000;

  const suffix = diff < 0 ? "后" : "前";

  if (absDiff < minute) return "刚刚";
  if (absDiff < hour) return `${Math.floor(absDiff / minute)} 分钟${suffix}`;
  if (absDiff < day) return `${Math.floor(absDiff / hour)} 小时${suffix}`;
  if (absDiff < week) return `${Math.floor(absDiff / day)} 天${suffix}`;
  if (absDiff < month) return `${Math.floor(absDiff / week)} 周${suffix}`;
  if (absDiff < year) return `${Math.floor(absDiff / month)} 个月${suffix}`;
  return `${Math.floor(absDiff / year)} 年${suffix}`;
}

/** 格式化数字（千分位） */
export function formatNumber(num: number): string {
  return num.toLocaleString("zh-CN");
}

/** 格式化百分比 */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}
