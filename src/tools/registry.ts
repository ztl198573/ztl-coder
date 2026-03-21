/**
 * 命令注册表
 * 统一工具定义和管理
 */

import { z } from "zod";
import { log } from "../utils/logger";

// ============================================
// 工具分类
// ============================================

export const READ_TOOLS = new Set([
  "look_at",
  "artifact_search",
  "load_ledger",
  "ast_grep_search",
  "ref_get",
  "ref_list",
]);

export const WRITE_TOOLS = new Set([
  "smart_commit",
  "ast_grep_replace",
  "ref_invalidate",
  "pty_spawn",
  "pty_write",
  "pty_kill",
]);

export const META_TOOLS = new Set([
  "status",
  "health_check",
  "ref_expire",
  "pty_list",
  "pty_read",
  "preamble",
  "ask_user_question",
]);

// ============================================
// 工具元数据
// ============================================

export interface ToolMeta {
  category: "read" | "write" | "meta";
  description: string;
  usage?: string;
  examples?: string[];
  requires?: string[];
  conflicts?: string[];
  safety?: "safe" | "caution" | "dangerous";
}

export const TOOL_DESCRIPTIONS: Record<string, ToolMeta> = {
  // 读取工具
  look_at: {
    category: "read",
    description: "提取文件结构，节省上下文",
    usage: "look_at <file_path> [--extract structure|imports|exports|all]",
    examples: ["look_at src/index.ts", "look_at src/ --extract imports"],
    safety: "safe",
  },
  artifact_search: {
    category: "read",
    description: "搜索历史工件（账本、计划、设计）",
    usage: "artifact_search <query> [--type ledger|plan|design]",
    examples: ["artifact_search 认证实现", "artifact_search --type plan"],
    safety: "safe",
  },
  load_ledger: {
    category: "read",
    description: "加载会话账本",
    usage: "load_ledger [--latest|--file <path>]",
    examples: ["load_ledger --latest"],
    safety: "safe",
  },
  ast_grep_search: {
    category: "read",
    description: "基于 AST 的代码搜索",
    usage: "ast_grep_search <pattern> [--lang <lang>] [--paths <paths>]",
    examples: ["ast_grep_search 'function $NAME($PARAMS)'", "ast_grep_search 'class $CLASS' --lang typescript"],
    safety: "safe",
  },
  ref_get: {
    category: "read",
    description: "获取引用详情",
    usage: "ref_get <ref_id>",
    examples: ["ref_get @n1", "ref_get @n5"],
    safety: "safe",
  },
  ref_list: {
    category: "read",
    description: "列出所有活跃引用",
    usage: "ref_list [--type <type>] [--file <file>]",
    examples: ["ref_list", "ref_list --type function"],
    safety: "safe",
  },

  // 写入工具
  smart_commit: {
    category: "write",
    description: "智能提交（待实现）",
    usage: "smart_commit <message>",
    safety: "caution",
  },
  ast_grep_replace: {
    category: "write",
    description: "基于 AST 的代码替换",
    usage: "ast_grep_replace <pattern> <replacement> [--dry-run]",
    examples: ["ast_grep_replace 'var $X' 'const $X'", "ast_grep_replace 'foo()' 'bar()' --dry-run"],
    safety: "caution",
  },
  ref_invalidate: {
    category: "write",
    description: "使引用失效",
    usage: "ref_invalidate <ref_id|--all|--file <file>>",
    examples: ["ref_invalidate @n1", "ref_invalidate --file src/old.ts"],
    safety: "safe",
  },
  pty_spawn: {
    category: "write",
    description: "启动后台进程会话",
    usage: "pty_spawn <command> [--args <args>]",
    examples: ["pty_spawn npm run dev"],
    safety: "caution",
  },
  pty_write: {
    category: "write",
    description: "向 PTY 会话发送输入",
    usage: "pty_write <session_id> <input>",
    examples: ["pty_write pty_123 'hello\\n'"],
    safety: "caution",
  },
  pty_kill: {
    category: "write",
    description: "终止 PTY 会话",
    usage: "pty_kill <session_id> [--force]",
    examples: ["pty_kill pty_123", "pty_kill pty_123 --force"],
    safety: "dangerous",
  },

  // 元工具
  status: {
    category: "meta",
    description: "显示系统状态",
    usage: "status",
    safety: "safe",
  },
  health_check: {
    category: "meta",
    description: "健康检查",
    usage: "health_check",
    safety: "safe",
  },
  ref_expire: {
    category: "meta",
    description: "清理过期引用",
    usage: "ref_expire [--max-age <minutes>]",
    examples: ["ref_expire", "ref_expire --max-age 60"],
    safety: "safe",
  },
  pty_list: {
    category: "meta",
    description: "列出所有 PTY 会话",
    usage: "pty_list",
    safety: "safe",
  },
  pty_read: {
    category: "meta",
    description: "读取 PTY 会话输出",
    usage: "pty_read <session_id> [--clear]",
    examples: ["pty_read pty_123", "pty_read pty_123 --clear"],
    safety: "safe",
  },
  preamble: {
    category: "meta",
    description: "执行启动检查",
    usage: "preamble --skill <skill_name>",
    examples: ["preamble --skill review"],
    safety: "safe",
  },
  ask_user_question: {
    category: "meta",
    description: "生成结构化用户问题",
    usage: "ask_user_question <question> [--options <json>]",
    examples: ["ask_user_question 'Continue?' --options '[{\"label\":\"Yes\"},{\"label\":\"No\"}]'"],
    safety: "safe",
  },
};

// ============================================
// 注册表类
// ============================================

export class ToolRegistry {
  private tools: Map<string, ToolMeta> = new Map();

  constructor() {
    // 初始化所有工具
    for (const [name, meta] of Object.entries(TOOL_DESCRIPTIONS)) {
      this.tools.set(name, meta);
    }
  }

  /**
   * 获取工具元数据
   */
  get(name: string): ToolMeta | undefined {
    return this.tools.get(name);
  }

  /**
   * 检查工具是否存在
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * 按分类获取工具
   */
  getByCategory(category: ToolMeta["category"]): string[] {
    const result: string[] = [];
    for (const [name, meta] of this.tools) {
      if (meta.category === category) {
        result.push(name);
      }
    }
    return result;
  }

  /**
   * 获取所有工具名
   */
  getAll(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * 检查工具是否为读工具
   */
  isReadTool(name: string): boolean {
    return READ_TOOLS.has(name);
  }

  /**
   * 检查工具是否为写工具
   */
  isWriteTool(name: string): boolean {
    return WRITE_TOOLS.has(name);
  }

  /**
   * 检查工具是否为元工具
   */
  isMetaTool(name: string): boolean {
    return META_TOOLS.has(name);
  }

  /**
   * 获取工具安全级别
   */
  getSafety(name: string): ToolMeta["safety"] {
    return this.tools.get(name)?.safety || "safe";
  }

  /**
   * 生成帮助文本
   */
  generateHelp(): string {
    const lines: string[] = ["ztl-coder 工具列表", ""];

    // 按分类分组
    const categories: Record<ToolMeta["category"], string[]> = {
      read: [],
      write: [],
      meta: [],
    };

    for (const [name, meta] of this.tools) {
      categories[meta.category].push(name);
    }

    for (const [category, tools] of Object.entries(categories)) {
      if (tools.length === 0) continue;
      const label = {
        read: "读取工具",
        write: "写入工具",
        meta: "元工具",
      }[category];
      lines.push(`**${label}**: ${tools.join(", ")}`);
    }

    return lines.join("\n");
  }

  /**
   * 生成工具详情
   */
  generateToolDoc(name: string): string {
    const meta = this.tools.get(name);
    if (!meta) {
      return `工具 "${name}" 不存在`;
    }

    const lines: string[] = [`## ${name}`, "", `**分类**: ${meta.category}`, "", meta.description];

    if (meta.usage) {
      lines.push("", "**用法**:", "```", meta.usage, "```");
    }

    if (meta.examples && meta.examples.length > 0) {
      lines.push("", "**示例**:");
      for (const example of meta.examples) {
        lines.push(`- \`${example}\``);
      }
    }

    lines.push("", `**安全级别**: ${meta.safety}`);

    return lines.join("\n");
  }
}

// 单例实例
export const toolRegistry = new ToolRegistry();
