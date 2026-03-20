/**
 * 交互式 Rebase 辅助工具
 *
 * 提供交互式 rebase 的规划和执行支持
 */

import { $ } from "bun";

/** Rebase 步骤类型 */
export type RebaseAction = "pick" | "reword" | "edit" | "squash" | "fixup" | "drop";

/** 单个 Rebase 步骤 */
export interface RebaseStep {
  /** 提交哈希 */
  hash: string;
  /** 原始提交消息 */
  message: string;
  /** 作者 */
  author: string;
  /** 日期 */
  date: string;
  /** 指定的操作 */
  action: RebaseAction;
}

/** Rebase 计划 */
export interface RebasePlan {
  /** 基准提交 */
  baseCommit: string;
  /** 目标分支 */
  targetBranch: string;
  /** 步骤列表（从旧到新） */
  steps: RebaseStep[];
  /** 是否有冲突风险 */
  hasConflictRisk: boolean;
  /** 预估时间（分钟） */
  estimatedTime: number;
}

/**
 * 获取待 rebase 的提交列表
 */
export async function getCommitsForRebase(
  baseBranch: string = "main",
  limit: number = 20,
): Promise<RebaseStep[]> {
  const steps: RebaseStep[] = [];

  try {
    const result = await $`git log ${baseBranch}..HEAD --oneline --format="%H|%s|%an|%ad" --date=short -n ${limit}`.quiet();

    if (result.exitCode === 0) {
      const lines = result.stdout.toString().trim().split("\n");
      for (const line of lines) {
        if (!line) continue;
        const [hash, message, author, date] = line.split("|");
        steps.push({
          hash: hash.slice(0, 7),
          message,
          author,
          date,
          action: "pick",
        });
      }
    }
  } catch (error) {
    console.error("获取提交列表时出错:", error);
  }

  // 反转顺序（从旧到新）
  return steps.reverse();
}

/**
 * 分析 rebase 计划并评估风险
 */
export async function planRebase(
  baseBranch: string = "main",
  targetBranch?: string,
): Promise<RebasePlan> {
  const steps = await getCommitsForRebase(baseBranch);

  // 检测潜在冲突风险
  let hasConflictRisk = false;
  try {
    // 检查是否有与远程分支的分歧
    const fetchResult = await $`git fetch --dry-run 2>&1 || true`.quiet();
    const statusResult = await $`git status --porcelain`.quiet();

    // 如果有未提交的更改，增加冲突风险
    if (statusResult.stdout.toString().trim()) {
      hasConflictRisk = true;
    }

    // 如果提交数量较多，也增加风险
    if (steps.length > 5) {
      hasConflictRisk = true;
    }
  } catch {
    hasConflictRisk = true;
  }

  // 估算时间（每个提交约 2 分钟）
  const estimatedTime = steps.length * 2;

  return {
    baseCommit: baseBranch,
    targetBranch: targetBranch || "HEAD",
    steps,
    hasConflictRisk,
    estimatedTime,
  };
}

/**
 * 生成 rebase 命令
 */
export function generateRebaseCommand(plan: RebasePlan): string {
  const lines: string[] = [];

  for (const step of plan.steps) {
    lines.push(`${step.action} ${step.hash} ${step.message}`);
  }

  // 创建临时文件路径
  const todoPath = `/tmp/git-rebase-todo-${Date.now()}.txt`;
  const todoContent = lines.join("\n");

  return `# 首先保存以下内容到 ${todoPath}:\n${todoContent}\n\n# 然后执行:\ngit rebase -i ${plan.baseCommit}`;
}

/**
 * 执行单个 rebase 步骤
 *
 * 注意：这个函数主要用于自动化场景，手动 rebase 仍建议使用 git rebase -i
 */
export async function executeRebaseStep(
  step: RebaseStep,
): Promise<{ success: boolean; message: string }> {
  try {
    switch (step.action) {
      case "pick":
        // pick 是默认行为，继续 rebase
        await $`git rebase --continue`.quiet();
        return { success: true, message: `已应用提交 ${step.hash}` };

      case "drop":
        // drop 需要在 todo 文件中删除该行
        return { success: true, message: `将跳过提交 ${step.hash}` };

      case "reword":
        // reword 需要编辑提交消息
        return {
          success: false,
          message: `提交 ${step.hash} 需要重新编辑消息，请使用 git commit --amend`,
        };

      case "edit":
        return {
          success: false,
          message: `已在提交 ${step.hash} 处暂停，可以进行修改后使用 git rebase --continue`,
        };

      case "squash":
      case "fixup":
        return {
          success: false,
          message: `提交 ${step.hash} 将被合并，请使用交互式 rebase`,
        };

      default:
        return { success: false, message: "未知操作" };
    }
  } catch (error) {
    return {
      success: false,
      message: `执行失败: ${error instanceof Error ? error.message : "未知错误"}`,
    };
  }
}

/**
 * 自动优化提交历史
 *
 * 分析提交并建议 squash/fixup 操作
 */
export async function suggestSquash(
  plan: RebasePlan,
): Promise<RebaseStep[]> {
  const suggestions = [...plan.steps];
  const messageGroups = new Map<string, number[]>();

  // 按提交消息前缀分组
  suggestions.forEach((step, index) => {
    const prefix = step.message.split(":")[0] || step.message.slice(0, 20);
    if (!messageGroups.has(prefix)) {
      messageGroups.set(prefix, []);
    }
    messageGroups.get(prefix)!.push(index);
  });

  // 对重复前缀的提交建议 fixup
  for (const [, indices] of messageGroups) {
    if (indices.length > 1) {
      // 保留第一个为 squash，其余为 fixup
      for (let i = 1; i < indices.length; i++) {
        suggestions[indices[i]].action = "fixup";
      }
    }
  }

  return suggestions;
}
