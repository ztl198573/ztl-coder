/**
 * AskUserQuestion 工具
 * 统一的用户交互格式，参考 gstack 模式
 */

import { z } from "zod";
import { log } from "../utils/logger";

// ============================================
// Schema 定义
// ============================================

export const askUserQuestionSchema = {
  question: z.string().describe("问题内容"),
  header: z.string().optional().describe("简短标签（最多 12 字符）"),
  options: z
    .array(
      z.object({
        label: z.string().describe("选项标签"),
        description: z.string().optional().describe("选项说明"),
        effort: z.string().optional().describe("工作量估算（如：human: ~2h / CC: ~15min）"),
        completeness: z.number().min(1).max(10).optional().describe("完整性评分 1-10"),
        recommended: z.boolean().optional().describe("是否推荐此选项"),
      })
    )
    .min(2)
    .max(4)
    .describe("选项列表（2-4 个）"),
  context: z
    .object({
      project: z.string().optional().describe("当前项目"),
      branch: z.string().optional().describe("当前分支"),
      task: z.string().optional().describe("当前任务"),
    })
    .optional()
    .describe("上下文信息"),
  recommendation: z.string().optional().describe("推荐理由"),
  multiSelect: z.boolean().optional().describe("是否多选"),
};

export type AskUserQuestionInput = {
  question: string;
  header?: string;
  options: Array<{
    label: string;
    description?: string;
    effort?: string;
    completeness?: number;
    recommended?: boolean;
  }>;
  context?: {
    project?: string;
    branch?: string;
    task?: string;
  };
  recommendation?: string;
  multiSelect?: boolean;
};

// ============================================
// 格式化输出
// ============================================

function formatQuestion(input: AskUserQuestionInput): string {
  const lines: string[] = [];

  // 1. 上下文重定向（Re-ground）
  if (input.context) {
    const { project, branch, task } = input.context;
    const contextParts: string[] = [];
    if (project) contextParts.push(`项目: ${project}`);
    if (branch) contextParts.push(`分支: ${branch}`);
    if (task) contextParts.push(`任务: ${task}`);
    if (contextParts.length > 0) {
      lines.push(`**上下文**: ${contextParts.join(" | ")}`);
      lines.push("");
    }
  }

  // 2. 问题
  lines.push(`## ${input.question}`);
  lines.push("");

  // 3. 选项
  const letters = ["A", "B", "C", "D"];
  input.options.forEach((option, index) => {
    const letter = letters[index];
    const recommended = option.recommended ? " ✓" : "";
    const completeness = option.completeness ? ` [完整性: ${option.completeness}/10]` : "";
    const effort = option.effort ? ` (${option.effort})` : "";

    lines.push(`**${letter})** ${option.label}${recommended}${completeness}${effort}`);
    if (option.description) {
      lines.push(`   ${option.description}`);
    }
    lines.push("");
  });

  // 4. 推荐
  if (input.recommendation) {
    lines.push(`**推荐**: ${input.recommendation}`);
    lines.push("");
  }

  // 5. 多选提示
  if (input.multiSelect) {
    lines.push("_（可多选）_");
  }

  return lines.join("\n");
}

// ============================================
// 执行函数
// ============================================

export async function executeAskUserQuestion(
  input: AskUserQuestionInput
): Promise<string> {
  log.info("生成用户问题", {
    operation: "ask_user_question",
    data: { question: input.question.slice(0, 50) },
  });

  // 验证至少有一个推荐选项
  const hasRecommendation = input.options.some((o) => o.recommended);
  if (!hasRecommendation && input.options.length > 1) {
    log.warn("没有推荐选项，建议添加 recommended 标记", {
      operation: "ask_user_question",
    });
  }

  // 验证完整性评分
  const lowCompleteness = input.options.find(
    (o) => o.completeness !== undefined && o.completeness <= 5
  );
  if (lowCompleteness) {
    log.warn(`选项 "${lowCompleteness.label}" 完整性评分较低 (${lowCompleteness.completeness}/10)`, {
      operation: "ask_user_question",
    });
  }

  return formatQuestion(input);
}

// ============================================
// 辅助函数：快速创建标准问题
// ============================================

/** 创建确认问题 */
export function createConfirmQuestion(
  question: string,
  context?: AskUserQuestionInput["context"]
): AskUserQuestionInput {
  return {
    question,
    context,
    options: [
      { label: "确认", recommended: true, completeness: 10 },
      { label: "取消", completeness: 10 },
    ],
    recommendation: "确认继续执行",
  };
}

/** 创建范围选择问题 */
export function createScopeQuestion(
  question: string,
  scopes: Array<{
    name: string;
    description: string;
    completeness: number;
  }>,
  context?: AskUserQuestionInput["context"]
): AskUserQuestionInput {
  const options = scopes.map((scope, index) => ({
    label: scope.name,
    description: scope.description,
    completeness: scope.completeness,
    recommended: scope.completeness >= 8 && index === 0,
    effort:
      scope.completeness >= 8
        ? "human: ~1天 / CC: ~30min"
        : "human: ~2h / CC: ~10min",
  }));

  const recommended = scopes.find((s) => s.completeness >= 8);

  return {
    question,
    context,
    options,
    recommendation: recommended
      ? `选择 "${recommended.name}" — 完整实现，覆盖所有边界情况`
      : undefined,
  };
}

/** 创建修复确认问题（Fix-First 模式） */
export function createFixConfirmQuestion(
  issues: Array<{
    severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFORMATIONAL";
    location: string;
    problem: string;
    fix: string;
    autoFixable: boolean;
  }>,
  context?: AskUserQuestionInput["context"]
): AskUserQuestionInput {
  const autoFixable = issues.filter((i) => i.autoFixable);
  const needConfirm = issues.filter((i) => !i.autoFixable);

  const options: AskUserQuestionInput["options"] = [
    {
      label: "全部修复",
      description: `自动修复 ${autoFixable.length} 个问题，确认修复 ${needConfirm.length} 个问题`,
      recommended: true,
      completeness: 10,
    },
    {
      label: "仅修复自动项",
      description: `只修复 ${autoFixable.length} 个可自动修复的问题`,
      completeness: 7,
    },
    {
      label: "跳过",
      description: "不进行任何修复",
      completeness: 3,
    },
  ];

  return {
    question: `发现 ${issues.length} 个问题（${autoFixable.length} 个可自动修复，${needConfirm.length} 个需确认）`,
    context,
    options,
    recommendation: "全部修复 — AI 时代边际成本趋近于零",
  };
}
