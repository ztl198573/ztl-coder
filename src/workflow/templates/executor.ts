/**
 * 模板执行器
 *
 * 负责应用和验证模板执行
 */

import type { WorkflowTemplate, TemplateContext, TemplateStep } from "./types.ts";
import { getTemplate } from "./loader.ts";

/** 执行结果 */
export interface ExecutionResult {
  /** 是否成功 */
  success: boolean;
  /** 模板 ID */
  templateId: string;
  /** 已完成的步骤 */
  completedSteps: string[];
  /** 失败的步骤 */
  failedSteps: string[];
  /** 错误信息 */
  errors: Map<string, string>;
  /** 开始时间 */
  startTime: Date;
  /** 结束时间 */
  endTime: Date | null;
}

/** 执行状态 */
export interface ExecutionState {
  /** 当前模板 */
  template: WorkflowTemplate;
  /** 上下文 */
  context: TemplateContext;
  /** 已完成的步骤 */
  completedSteps: Set<string>;
  /** 正在执行的步骤 */
  currentSteps: Set<string>;
  /** 失败的步骤 */
  failedSteps: Set<string>;
}

/**
 * 验证模板是否有效
 */
export function validateTemplate(template: WorkflowTemplate): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!template.id) {
    errors.push("模板缺少 ID");
  }

  if (!template.name) {
    errors.push("模板缺少名称");
  }

  if (!template.steps || template.steps.length === 0) {
    errors.push("模板必须包含至少一个步骤");
  }

  // 验证步骤依赖关系
  const stepIds = new Set(template.steps.map((s) => s.id));
  for (const step of template.steps) {
    if (step.dependsOn) {
      for (const dep of step.dependsOn) {
        if (!stepIds.has(dep)) {
          errors.push(`步骤 "${step.id}" 依赖不存在的步骤 "${dep}"`);
        }
      }
    }
  }

  // 检测循环依赖
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function hasCycle(stepId: string): boolean {
    if (recursionStack.has(stepId)) return true;
    if (visited.has(stepId)) return false;

    visited.add(stepId);
    recursionStack.add(stepId);

    const step = template.steps.find((s) => s.id === stepId);
    if (step?.dependsOn) {
      for (const dep of step.dependsOn) {
        if (hasCycle(dep)) return true;
      }
    }

    recursionStack.delete(stepId);
    return false;
  }

  for (const step of template.steps) {
    if (hasCycle(step.id)) {
      errors.push("检测到循环依赖");
      break;
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 获取可执行的步骤（依赖已满足）
 */
export function getExecutableSteps(
  template: WorkflowTemplate,
  completedSteps: Set<string>,
): TemplateStep[] {
  const executable: TemplateStep[] = [];

  for (const step of template.steps) {
    // 跳过已完成或正在执行的步骤
    if (completedSteps.has(step.id)) continue;

    // 检查依赖是否满足
    if (step.dependsOn) {
      const depsMet = step.dependsOn.every((dep) => completedSteps.has(dep));
      if (!depsMet) continue;
    }

    executable.push(step);
  }

  return executable;
}

/**
 * 应用模板（生成执行计划）
 */
export function applyTemplate(
  templateId: string,
  context: TemplateContext,
): ExecutionState | null {
  const template = getTemplate(templateId);
  if (!template) {
    console.error(`模板未找到: ${templateId}`);
    return null;
  }

  // 验证模板
  const { valid, errors } = validateTemplate(template);
  if (!valid) {
    console.error(`模板验证失败: ${errors.join(", ")}`);
    return null;
  }

  return {
    template,
    context,
    completedSteps: new Set(),
    currentSteps: new Set(),
    failedSteps: new Set(),
  };
}

/**
 * 生成执行计划 Markdown
 */
export function generateExecutionPlan(
  state: ExecutionState,
  outputFormat: "markdown" | "json" = "markdown",
): string {
  const { template, context, completedSteps } = state;

  if (outputFormat === "json") {
    return JSON.stringify(
      {
        template: {
          id: template.id,
          name: template.name,
        },
        context,
        progress: {
          completed: completedSteps.size,
          total: template.steps.length,
          percentage: Math.round(
            (completedSteps.size / template.steps.length) * 100,
          ),
        },
        steps: template.steps.map((step) => ({
          ...step,
          status: completedSteps.has(step.id)
            ? "completed"
            : "pending",
        })),
      },
      null,
      2,
    );
  }

  // Markdown 格式
  let markdown = `# 执行计划: ${template.name}\n\n`;
  markdown += `**模板:** ${template.id} v${template.version}\n`;
  markdown += `**项目:** ${context.projectName}\n`;
  markdown += `**描述:** ${context.taskDescription}\n\n`;

  markdown += `## 进度\n\n`;
  const percentage = Math.round(
    (completedSteps.size / template.steps.length) * 100,
  );
  const barLength = 20;
  const filled = Math.round((percentage / 100) * barLength);
  const bar = "█".repeat(filled) + "░".repeat(barLength - filled);
  markdown += `\`${bar}\` ${percentage}% (${completedSteps.size}/${template.steps.length})\n\n`;

  markdown += `## 步骤\n\n`;

  for (const step of template.steps) {
    const status = completedSteps.has(step.id) ? "✅" : "⏳";
    markdown += `### ${status} ${step.name}\n\n`;
    markdown += `- **ID:** ${step.id}\n`;
    markdown += `- **代理:** ${step.agent}\n`;
    markdown += `- **描述:** ${step.description}\n`;

    if (step.dependsOn?.length) {
      markdown += `- **依赖:** ${step.dependsOn.join(", ")}\n`;
    }

    if (step.parallel) {
      markdown += `- **可并行:** 是\n`;
    }

    markdown += "\n";
  }

  return markdown;
}
