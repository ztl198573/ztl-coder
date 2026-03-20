/**
 * 分支管理工具
 *
 * 提供高级分支操作功能
 */

import { $ } from "bun";

/** 分支信息 */
export interface BranchInfo {
  /** 分支名 */
  name: string;
  /** 是否为当前分支 */
  isCurrent: boolean;
  /** 是否已合并到 main */
  isMerged: boolean;
  /** 最后提交哈希 */
  lastCommit: string;
  /** 最后提交消息 */
  lastMessage: string;
  /** 作者 */
  author: string;
  /** 相对于 main 的提交数 */
  ahead: number;
  /** 落后于 main 的提交数 */
  behind: number;
  /** 最后活动时间 */
  lastActivity: Date;
  /** 分支类型 */
  type: "feature" | "bugfix" | "release" | "hotfix" | "other";
}

/** 分支类型检测规则 */
const BRANCH_PATTERNS: Array<{ pattern: RegExp; type: BranchInfo["type"] }> = [
  { pattern: /^(feature|feat)\//i, type: "feature" },
  { pattern: /^(bugfix|fix|bug)\//i, type: "bugfix" },
  { pattern: /^release\//i, type: "release" },
  { pattern: /^(hotfix|hf)\//i, type: "hotfix" },
];

/**
 * 检测分支类型
 */
function detectBranchType(name: string): BranchInfo["type"] {
  for (const { pattern, type } of BRANCH_PATTERNS) {
    if (pattern.test(name)) {
      return type;
    }
  }
  return "other";
}

/**
 * 列出所有分支信息
 */
export async function listBranches(
  mainBranch: string = "main",
): Promise<BranchInfo[]> {
  const branches: BranchInfo[] = [];

  try {
    // 获取所有分支
    const branchResult = await $`git branch -a --format="%(refname:short)|%(HEAD)|%(objectname:short)|%(contents:subject)|%(authorname)"`.quiet();

    if (branchResult.exitCode !== 0) {
      return branches;
    }

    const currentBranch = await getCurrentBranch();
    const lines = branchResult.stdout.toString().trim().split("\n");

    for (const line of lines) {
      if (!line || line.includes("HEAD ->")) continue;

      const [name, isHead, commit, message, author] = line.split("|");
      const branchName = name.replace("remotes/origin/", "").trim();

      // 跳过远程分支的重复显示
      if (name.startsWith("remotes/origin/")) continue;

      // 获取 ahead/behind 信息
      let ahead = 0;
      let behind = 0;
      try {
        const countResult = await $`git rev-list --left-right --count ${mainBranch}...${branchName}`.quiet();
        if (countResult.exitCode === 0) {
          const [behindCount, aheadCount] = countResult.stdout.toString().trim().split(/\s+/);
          ahead = parseInt(aheadCount) || 0;
          behind = parseInt(behindCount) || 0;
        }
      } catch {
        // 分支可能没有共同祖先
      }

      // 检查是否已合并
      let isMerged = false;
      try {
        const mergeResult = await $`git branch --merged ${mainBranch} --list ${branchName}`.quiet();
        isMerged = mergeResult.stdout.toString().trim().length > 0;
      } catch {
        // 忽略错误
      }

      // 获取最后活动时间
      let lastActivity = new Date();
      try {
        const dateResult = await $`git log -1 --format=%cd --date=iso ${branchName}`.quiet();
        if (dateResult.exitCode === 0 && dateResult.stdout.toString().trim()) {
          lastActivity = new Date(dateResult.stdout.toString().trim());
        }
      } catch {
        // 忽略错误
      }

      branches.push({
        name: branchName,
        isCurrent: branchName === currentBranch,
        isMerged,
        lastCommit: commit,
        lastMessage: message,
        author,
        ahead,
        behind,
        lastActivity,
        type: detectBranchType(branchName),
      });
    }
  } catch (error) {
    console.error("获取分支列表时出错:", error);
  }

  return branches.sort((a, b) => {
    // 当前分支优先
    if (a.isCurrent) return -1;
    if (b.isCurrent) return 1;
    // 然后按活动时间排序
    return b.lastActivity.getTime() - a.lastActivity.getTime();
  });
}

/**
 * 获取当前分支名
 */
export async function getCurrentBranch(): Promise<string> {
  try {
    const result = await $`git branch --show-current`.quiet();
    return result.stdout.toString().trim();
  } catch {
    return "";
  }
}

/**
 * 创建功能分支
 */
export async function createFeatureBranch(
  name: string,
  type: BranchInfo["type"] = "feature",
  baseBranch: string = "main",
): Promise<{ success: boolean; branchName: string; message: string }> {
  const prefix = {
    feature: "feature",
    bugfix: "bugfix",
    release: "release",
    hotfix: "hotfix",
    other: "",
  }[type];

  const branchName = prefix ? `${prefix}/${name}` : name;

  try {
    // 确保基准分支是最新的
    await $`git fetch origin ${baseBranch}`.quiet();

    // 创建并切换到新分支
    await $`git checkout -b ${branchName} origin/${baseBranch}`.quiet();

    return {
      success: true,
      branchName,
      message: `已创建并切换到分支 ${branchName}`,
    };
  } catch (error) {
    return {
      success: false,
      branchName,
      message: `创建分支失败: ${error instanceof Error ? error.message : "未知错误"}`,
    };
  }
}

/**
 * 清理已合并的分支
 */
export async function cleanupMergedBranches(
  mainBranch: string = "main",
  dryRun: boolean = true,
): Promise<{ deleted: string[]; skipped: string[]; errors: string[] }> {
  const result = {
    deleted: [] as string[],
    skipped: [] as string[],
    errors: [] as string[],
  };

  try {
    const branches = await listBranches(mainBranch);
    const currentBranch = await getCurrentBranch();

    for (const branch of branches) {
      // 跳过当前分支和主分支
      if (branch.name === currentBranch || branch.name === mainBranch) {
        result.skipped.push(branch.name);
        continue;
      }

      // 只清理已合并的分支
      if (!branch.isMerged) {
        result.skipped.push(branch.name);
        continue;
      }

      // 跳过远程分支
      if (branch.name.includes("/")) {
        result.skipped.push(branch.name);
        continue;
      }

      if (dryRun) {
        result.deleted.push(branch.name);
      } else {
        try {
          await $`git branch -d ${branch.name}`.quiet();
          result.deleted.push(branch.name);
        } catch (error) {
          result.errors.push(`${branch.name}: ${error instanceof Error ? error.message : "删除失败"}`);
        }
      }
    }
  } catch (error) {
    result.errors.push(`清理失败: ${error instanceof Error ? error.message : "未知错误"}`);
  }

  return result;
}

/**
 * 生成分支状态报告
 */
export async function generateBranchReport(
  mainBranch: string = "main",
): Promise<string> {
  const branches = await listBranches(mainBranch);
  const currentBranch = await getCurrentBranch();

  let report = "# 分支状态报告\n\n";
  report += `**当前分支:** ${currentBranch}\n`;
  report += `**主分支:** ${mainBranch}\n`;
  report += `**总分支数:** ${branches.length}\n\n`;

  // 按类型分组
  const grouped = new Map<BranchInfo["type"], BranchInfo[]>();
  for (const branch of branches) {
    const type = branch.type;
    if (!grouped.has(type)) {
      grouped.set(type, []);
    }
    grouped.get(type)!.push(branch);
  }

  for (const [type, typeBranches] of grouped) {
    report += `## ${type.toUpperCase()} (${typeBranches.length})\n\n`;
    for (const branch of typeBranches) {
      const status = branch.isMerged ? "✅ 已合并" : `⏳ +${branch.ahead}/-${branch.behind}`;
      const current = branch.isCurrent ? " *" : "";
      report += `- **${branch.name}**${current}: ${status}\n`;
      report += `  - 最后提交: ${branch.lastCommit.slice(0, 7)} ${branch.lastMessage.slice(0, 50)}\n`;
      report += `  - 作者: ${branch.author}\n\n`;
    }
  }

  // 可清理的分支
  const mergedBranches = branches.filter(
    (b) => b.isMerged && !b.isCurrent && b.name !== mainBranch,
  );
  if (mergedBranches.length > 0) {
    report += `## 可清理的分支\n\n`;
    report += `以下 ${mergedBranches.length} 个分支已合并到 ${mainBranch}，可以安全删除：\n\n`;
    for (const branch of mergedBranches) {
      report += `- ${branch.name}\n`;
    }
  }

  return report;
}
