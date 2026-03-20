/**
 * 冲突解决辅助工具
 *
 * 分析 Git 冲突并提供解决建议
 */

import { $ } from "bun";

/** 冲突文件信息 */
export interface ConflictInfo {
  /** 文件路径 */
  path: string;
  /** 冲突类型 */
  type: "content" | "rename" | "delete" | "both-modified";
  /** 冲突块数量 */
  conflictBlocks: number;
  /** 冲突内容预览 */
  preview: string;
}

/** 解决建议 */
export interface ResolutionSuggestion {
  /** 文件路径 */
  path: string;
  /** 建议策略 */
  strategy: "ours" | "theirs" | "manual" | "combine";
  /** 置信度 (0-1) */
  confidence: number;
  /** 建议说明 */
  reason: string;
  /** 自动解决命令（如果可用） */
  command?: string;
}

/** 冲突标记正则 */
const CONFLICT_PATTERN = /<<<<<<< .+\n([\s\S]*?)\n=======\n([\s\S]*?)\n>>>>>>> .+/g;

/**
 * 分析当前仓库中的冲突
 */
export async function analyzeConflicts(
  repoPath: string = ".",
): Promise<ConflictInfo[]> {
  const conflicts: ConflictInfo[] = [];

  try {
    // 获取冲突文件列表
    const result = await $`git -C ${repoPath} diff --name-only --diff-filter=U`.quiet();

    if (result.exitCode !== 0 || !result.stdout.toString().trim()) {
      return conflicts;
    }

    const conflictFiles = result.stdout.toString().trim().split("\n");

    for (const file of conflictFiles) {
      if (!file) continue;

      const filePath = `${repoPath}/${file}`;
      const content = await Bun.file(filePath).text();
      const blocks = content.match(CONFLICT_PATTERN) || [];

      // 确定冲突类型
      let type: ConflictInfo["type"] = "content";
      if (content.includes("CONFLICT (rename/delete)")) {
        type = "rename";
      } else if (content.includes("CONFLICT (delete/modify)")) {
        type = "delete";
      } else if (blocks.length > 0) {
        type = "both-modified";
      }

      conflicts.push({
        path: file,
        type,
        conflictBlocks: blocks.length,
        preview: blocks[0]?.slice(0, 200) || "无预览",
      });
    }
  } catch (error) {
    console.error("分析冲突时出错:", error);
  }

  return conflicts;
}

/**
 * 为冲突提供解决建议
 */
export async function suggestResolution(
  conflict: ConflictInfo,
): Promise<ResolutionSuggestion> {
  const { path, type, conflictBlocks } = conflict;

  // 基于冲突类型提供策略建议
  switch (type) {
    case "delete":
      return {
        path,
        strategy: "manual",
        confidence: 0.6,
        reason: "文件在一侧被删除，在另一侧被修改。需要手动决定保留还是删除。",
      };

    case "rename":
      return {
        path,
        strategy: "manual",
        confidence: 0.5,
        reason: "文件重命名冲突，需要手动确认最终文件名。",
      };

    case "both-modified":
      // 简单冲突可能可以自动合并
      if (conflictBlocks === 1) {
        return {
          path,
          strategy: "combine",
          confidence: 0.7,
          reason: "单个冲突块，建议手动审查后合并两边的修改。",
          command: `git checkout --conflict=diff3 ${path}`,
        };
      }
      return {
        path,
        strategy: "manual",
        confidence: 0.4,
        reason: `存在 ${conflictBlocks} 个冲突块，需要逐个手动解决。`,
        command: `git mergetool ${path}`,
      };

    default:
      return {
        path,
        strategy: "manual",
        confidence: 0.3,
        reason: "未知冲突类型，建议手动解决。",
      };
  }
}

/**
 * 批量分析并生成解决建议
 */
export async function analyzeAndSuggest(
  repoPath: string = ".",
): Promise<Map<string, ResolutionSuggestion>> {
  const conflicts = await analyzeConflicts(repoPath);
  const suggestions = new Map<string, ResolutionSuggestion>();

  for (const conflict of conflicts) {
    const suggestion = await suggestResolution(conflict);
    suggestions.set(conflict.path, suggestion);
  }

  return suggestions;
}
