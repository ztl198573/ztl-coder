/**
 * Git 增强工具模块
 *
 * 提供高级 Git 操作功能：
 * - 交互式 rebase 辅助
 * - 冲突解决辅助
 * - 智能提交消息生成
 * - 分支管理工具
 */

export {
  analyzeConflicts,
  suggestResolution,
  type ConflictInfo,
  type ResolutionSuggestion,
} from "./conflict-resolver.ts";

export {
  generateCommitMessage,
  analyzeChanges,
  type CommitSuggestion,
  type ChangeAnalysis,
} from "./smart-commit.ts";

export {
  planRebase,
  executeRebaseStep,
  type RebasePlan,
  type RebaseStep,
} from "./interactive-rebase.ts";

export {
  listBranches,
  createFeatureBranch,
  cleanupMergedBranches,
  type BranchInfo,
} from "./branch-manager.ts";
