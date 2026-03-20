/**
 * 增量计划模块
 *
 * 提供计划的增量更新、差异检测和版本管理功能
 */

export {
  createIncrementalPlanManager,
  type IncrementalPlanManager,
} from "./manager.ts";

export type {
  Plan,
  PlanItem,
  PlanVersion,
  PlanDiff,
  PlanMetadata,
  PlanItemStatus,
  IncrementalUpdateOptions,
} from "./types.ts";

export { DEFAULT_OPTIONS } from "./types.ts";
