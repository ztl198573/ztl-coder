/**
 * 智能提交消息生成器
 *
 * 分析代码变更并生成符合规范的提交消息
 */

import { $ } from "bun";

/** 变更分析结果 */
export interface ChangeAnalysis {
  /** 变更类型统计 */
  types: {
    added: number;
    modified: number;
    deleted: number;
    renamed: number;
  };
  /** 按扩展名分组的文件 */
  byExtension: Map<string, string[]>;
  /** 检测到的变更主题 */
  themes: string[];
  /** 是否包含破坏性变更 */
  hasBreakingChange: boolean;
  /** 影响范围 */
  scope: string | null;
}

/** 提交建议 */
export interface CommitSuggestion {
  /** 提交类型 */
  type: "feat" | "fix" | "docs" | "style" | "refactor" | "test" | "chore" | "perf";
  /** 作用域 */
  scope: string | null;
  /** 提交主题 */
  subject: string;
  /** 完整提交消息 */
  message: string;
  /** 置信度 */
  confidence: number;
}

/** 提交类型关键词映射 */
const TYPE_KEYWORDS: Record<CommitSuggestion["type"], string[]> = {
  feat: ["新增", "添加", "实现", "add", "implement", "create", "new", "feature"],
  fix: ["修复", "解决", "fix", "bug", "resolve", "patch", "error"],
  docs: ["文档", "readme", "doc", "comment", "文档化"],
  style: ["格式", "样式", "style", "format", "lint", "prettier"],
  refactor: ["重构", "优化", "refactor", "optimize", "clean", "improve"],
  test: ["测试", "test", "spec", "coverage", "mock"],
  chore: ["构建", "依赖", "chore", "build", "dep", "ci", "config"],
  perf: ["性能", "perf", "performance", "speed", "fast", "cache"],
};

/** 文件扩展名到作用域的映射 */
const EXTENSION_SCOPE: Record<string, string> = {
  ".ts": "ts",
  ".tsx": "react",
  ".js": "js",
  ".jsx": "react",
  ".vue": "vue",
  ".py": "py",
  ".go": "go",
  ".rs": "rust",
  ".md": "docs",
  ".json": "config",
  ".yaml": "config",
  ".yml": "config",
  ".css": "style",
  ".scss": "style",
};

/**
 * 分析当前暂存的变更
 */
export async function analyzeChanges(
  repoPath: string = ".",
): Promise<ChangeAnalysis> {
  const analysis: ChangeAnalysis = {
    types: { added: 0, modified: 0, deleted: 0, renamed: 0 },
    byExtension: new Map(),
    themes: [],
    hasBreakingChange: false,
    scope: null,
  };

  try {
    // 获取暂存区状态
    const statusResult = await $`git -C ${repoPath} diff --cached --numstat`.quiet();
    const diffResult = await $`git -C ${repoPath} diff --cached`.quiet();

    if (statusResult.exitCode === 0) {
      const lines = statusResult.stdout.toString().trim().split("\n");
      for (const line of lines) {
        if (!line) continue;
        const [added, deleted, filepath] = line.split("\t");

        if (added === "-") {
          analysis.types.renamed++;
        } else if (parseInt(added) > 0 && parseInt(deleted) === 0) {
          analysis.types.added++;
        } else if (parseInt(added) === 0 && parseInt(deleted) > 0) {
          analysis.types.deleted++;
        } else {
          analysis.types.modified++;
        }

        // 按扩展名分组
        const ext = filepath.includes(".") ? `.${filepath.split(".").pop()}` : "unknown";
        if (!analysis.byExtension.has(ext)) {
          analysis.byExtension.set(ext, []);
        }
        analysis.byExtension.get(ext)!.push(filepath);
      }
    }

    // 检测破坏性变更
    const diffContent = diffResult.stdout.toString();
    analysis.hasBreakingChange =
      diffContent.includes("BREAKING CHANGE") ||
      diffContent.includes("breaking:") ||
      diffContent.includes("!:");

    // 推断作用域
    const extensions = Array.from(analysis.byExtension.keys());
    if (extensions.length === 1) {
      const ext = extensions[0];
      analysis.scope = EXTENSION_SCOPE[ext] || null;
    } else if (extensions.length > 1) {
      // 找出最常见的作用域
      const scopeCounts = new Map<string, number>();
      for (const ext of extensions) {
        const scope = EXTENSION_SCOPE[ext] || "core";
        scopeCounts.set(scope, (scopeCounts.get(scope) || 0) + 1);
      }
      const sorted = [...scopeCounts.entries()].sort((a, b) => b[1] - a[1]);
      analysis.scope = sorted[0][0];
    }

    // 检测变更主题（从 diff 内容中提取关键词）
    const keywords = extractKeywords(diffContent);
    analysis.themes = keywords.slice(0, 3);
  } catch (error) {
    console.error("分析变更时出错:", error);
  }

  return analysis;
}

/**
 * 从 diff 内容中提取关键词
 */
function extractKeywords(diffContent: string): string[] {
  const keywords: string[] = [];

  // 提取函数名
  const funcMatches = diffContent.matchAll(/(?:function|def|fn|func)\s+(\w+)/g);
  for (const match of funcMatches) {
    keywords.push(match[1]);
  }

  // 提取类名
  const classMatches = diffContent.matchAll(/(?:class|interface|struct)\s+(\w+)/g);
  for (const match of classMatches) {
    keywords.push(match[1]);
  }

  return [...new Set(keywords)].slice(0, 5);
}

/**
 * 根据分析结果推断提交类型
 */
function inferCommitType(analysis: ChangeAnalysis): CommitSuggestion["type"] {
  const { types, themes, byExtension } = analysis;

  // 检查文件类型
  const extensions = Array.from(byExtension.keys());

  if (extensions.some((e) => [".md", ".txt"].includes(e)) && extensions.length === 1) {
    return "docs";
  }

  if (extensions.some((e) => [".test.", ".spec.", "_test.", "_spec."].some((s) => e.includes(s)))) {
    return "test";
  }

  if (extensions.some((e) => [".css", ".scss", ".less"].includes(e))) {
    return "style";
  }

  // 基于变更比例推断
  if (types.added > types.modified + types.deleted) {
    return "feat";
  }

  if (types.deleted > types.added + types.modified) {
    return "refactor";
  }

  // 默认返回修改
  return "fix";
}

/**
 * 生成提交消息建议
 */
export async function generateCommitMessage(
  repoPath: string = ".",
  customType?: CommitSuggestion["type"],
): Promise<CommitSuggestion> {
  const analysis = await analyzeChanges(repoPath);

  const type = customType || inferCommitType(analysis);
  const scope = analysis.scope;
  const themes = analysis.themes;

  // 生成主题
  let subject = "";
  if (themes.length > 0) {
    subject = `更新 ${themes.slice(0, 2).join(" 和 ")}`;
  } else if (analysis.types.added > 0) {
    subject = "添加新功能";
  } else if (analysis.types.modified > 0) {
    subject = "修改现有功能";
  } else if (analysis.types.deleted > 0) {
    subject = "移除冗余代码";
  } else {
    subject = "更新代码";
  }

  // 构建完整提交消息
  const typeStr = type;
  const scopeStr = scope ? `(${scope})` : "";
  const breakingStr = analysis.hasBreakingChange ? "!" : "";

  const header = `${typeStr}${scopeStr}${breakingStr}: ${subject}`;

  let body = "";
  if (analysis.types.added > 0) {
    body += `- 新增 ${analysis.types.added} 个文件\n`;
  }
  if (analysis.types.modified > 0) {
    body += `- 修改 ${analysis.types.modified} 个文件\n`;
  }
  if (analysis.types.deleted > 0) {
    body += `- 删除 ${analysis.types.deleted} 个文件\n`;
  }

  const footer = analysis.hasBreakingChange
    ? "\n\nBREAKING CHANGE: 此提交包含破坏性变更\n"
    : "";

  const message = `${header}\n\n${body}${footer}`.trim();

  return {
    type,
    scope,
    subject,
    message,
    confidence: themes.length > 0 ? 0.8 : 0.6,
  };
}
