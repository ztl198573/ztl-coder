/**
 * Fix-First Review 模式
 * 自动修复简单问题 + 批量询问复杂问题
 */

import { z } from "zod";
import { log } from "../utils/logger";
import {
  createFixConfirmQuestion,
  type AskUserQuestionInput,
} from "./ask-user-question";

// ============================================
// 类型定义
// ============================================

export type IssueSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFORMATIONAL";

export type IssueCategory =
  | "sql_safety"
  | "race_condition"
  | "llm_trust_boundary"
  | "enum_completeness"
  | "conditional_side_effects"
  | "magic_numbers"
  | "dead_code"
  | "test_gap"
  | "style"
  | "security"
  | "other";

export interface ReviewIssue {
  id: string;
  severity: IssueSeverity;
  category: IssueCategory;
  location: {
    file: string;
    line?: number;
    column?: number;
  };
  problem: string;
  fix: string;
  autoFixable: boolean;
  autoFixAction?: () => Promise<void>;
  references?: string[];
}

export interface ReviewResult {
  approved: boolean;
  issues: ReviewIssue[];
  autoFixed: ReviewIssue[];
  needsConfirmation: ReviewIssue[];
  summary: string;
}

// ============================================
// Schema 定义
// ============================================

export const fixFirstReviewSchema = {
  target: z.string().describe("审查目标（文件、分支、PR 等）"),
  categories: z
    .array(z.enum([
      "sql_safety",
      "race_condition",
      "llm_trust_boundary",
      "enum_completeness",
      "conditional_side_effects",
      "magic_numbers",
      "dead_code",
      "test_gap",
      "style",
      "security",
      "other",
    ]))
    .optional()
    .describe("要检查的类别"),
  autoFix: z.boolean().optional().default(true).describe("是否自动修复可修复的问题"),
};

export type FixFirstReviewInput = {
  target: string;
  categories?: IssueCategory[];
  autoFix?: boolean;
};

// ============================================
// 分类规则
// ============================================

/**
 * 判断问题是否可自动修复
 *
 * 可自动修复的条件：
 * - 非关键问题（非 CRITICAL）
 * - 有明确的修复方案
 * - 修复不涉及业务逻辑判断
 */
export function isAutoFixable(issue: ReviewIssue): boolean {
  // 关键问题总是需要确认
  if (issue.severity === "CRITICAL") {
    return false;
  }

  // 高风险类别需要确认
  const highRiskCategories: IssueCategory[] = [
    "sql_safety",
    "race_condition",
    "llm_trust_boundary",
    "security",
  ];
  if (highRiskCategories.includes(issue.category)) {
    return false;
  }

  // 样式和简单问题可自动修复
  const autoFixableCategories: IssueCategory[] = [
    "style",
    "magic_numbers",
    "dead_code",
  ];
  if (autoFixableCategories.includes(issue.category)) {
    return true;
  }

  // 默认需要确认
  return false;
}

// ============================================
// 执行函数
// ============================================

export async function executeFixFirstReview(
  input: FixFirstReviewInput
): Promise<ReviewResult> {
  log.info(`Fix-First Review 开始: ${input.target}`, {
    operation: "fix_first_review",
  });

  const issues: ReviewIssue[] = [];
  const autoFixed: ReviewIssue[] = [];
  const needsConfirmation: ReviewIssue[] = [];

  // 1. 收集问题（由调用者填充）
  // 这里是框架，实际问题收集在具体审查工具中完成

  // 2. 分类问题
  for (const issue of issues) {
    if (input.autoFix !== false && isAutoFixable(issue)) {
      autoFixed.push(issue);
    } else {
      needsConfirmation.push(issue);
    }
  }

  // 3. 自动修复
  for (const issue of autoFixed) {
    if (issue.autoFixAction) {
      try {
        await issue.autoFixAction();
        log.info(`自动修复: ${issue.id}`, {
          operation: "fix_first_review",
          data: { location: issue.location },
        });
      } catch (error) {
        log.error(`自动修复失败: ${issue.id}`, {
          operation: "fix_first_review",
        });
        // 修复失败，移到需要确认列表
        autoFixed.splice(autoFixed.indexOf(issue), 1);
        needsConfirmation.push(issue);
      }
    }
  }

  // 4. 生成结果
  const approved = issues.length === 0 || (autoFixed.length === issues.length);
  const summary = formatReviewSummary(issues, autoFixed, needsConfirmation);

  return {
    approved,
    issues,
    autoFixed,
    needsConfirmation,
    summary,
  };
}

// ============================================
// 输出格式化
// ============================================

function formatReviewSummary(
  issues: ReviewIssue[],
  autoFixed: ReviewIssue[],
  needsConfirmation: ReviewIssue[]
): string {
  const lines: string[] = [];

  const critical = issues.filter((i) => i.severity === "CRITICAL").length;
  const high = issues.filter((i) => i.severity === "HIGH").length;
  const medium = issues.filter((i) => i.severity === "MEDIUM").length;
  const low = issues.filter((i) => i.severity === "LOW").length;
  const info = issues.filter((i) => i.severity === "INFORMATIONAL").length;

  lines.push(`## Fix-First Review 结果`);
  lines.push("");
  lines.push(`**总问题**: ${issues.length}`);
  lines.push(
    `**严重性分布**: ${critical} Critical | ${high} High | ${medium} Medium | ${low} Low | ${info} Info`
  );
  lines.push("");

  if (autoFixed.length > 0) {
    lines.push(`### 自动修复 (${autoFixed.length})`);
    for (const issue of autoFixed) {
      const loc = formatLocation(issue.location);
      lines.push(`- [AUTO-FIXED] ${loc} ${issue.problem} → ${issue.fix}`);
    }
    lines.push("");
  }

  if (needsConfirmation.length > 0) {
    lines.push(`### 需要确认 (${needsConfirmation.length})`);
    for (const issue of needsConfirmation) {
      const loc = formatLocation(issue.location);
      lines.push(`- [${issue.severity}] ${loc} ${issue.problem}`);
      lines.push(`  修复: ${issue.fix}`);
    }
  }

  if (issues.length === 0) {
    lines.push("✅ 未发现问题");
  }

  return lines.join("\n");
}

function formatLocation(location: ReviewIssue["location"]): string {
  if (location.line) {
    return `${location.file}:${location.line}`;
  }
  return location.file;
}

// ============================================
// 生成确认问题
// ============================================

export function generateConfirmationQuestion(
  result: ReviewResult,
  context?: AskUserQuestionInput["context"]
): AskUserQuestionInput {
  return createFixConfirmQuestion(
    result.needsConfirmation.map((issue) => ({
      severity: issue.severity,
      location: formatLocation(issue.location),
      problem: issue.problem,
      fix: issue.fix,
      autoFixable: false,
    })),
    context
  );
}

// ============================================
// 快速创建问题
// ============================================

export function createIssue(
  params: Partial<ReviewIssue> & {
    severity: IssueSeverity;
    category: IssueCategory;
    problem: string;
    fix: string;
    location: ReviewIssue["location"];
  }
): ReviewIssue {
  return {
    id: `issue-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    autoFixable: false,
    ...params,
  };
}
