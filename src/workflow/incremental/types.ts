/**
 * 增量计划类型定义
 */

/** 计划项状态 */
export type PlanItemStatus = "pending" | "in_progress" | "completed" | "blocked" | "skipped";

/** 计划项 */
export interface PlanItem {
  /** 唯一标识 */
  id: string;
  /** 标题 */
  title: string;
  /** 描述 */
  description?: string;
  /** 状态 */
  status: PlanItemStatus;
  /** 优先级 */
  priority: number;
  /** 依赖项 ID */
  dependsOn?: string[];
  /** 标签 */
  tags?: string[];
  /** 估计时间（分钟） */
  estimatedMinutes?: number;
  /** 实际耗时（分钟） */
  actualMinutes?: number;
  /** 负责人/代理 */
  assignee?: string;
  /** 创建时间 */
  createdAt: Date;
  /** 更新时间 */
  updatedAt: Date;
  /** 完成时间 */
  completedAt?: Date;
  /** 备注 */
  notes?: string;
}

/** 计划版本 */
export interface PlanVersion {
  /** 版本号 */
  version: number;
  /** 计划内容哈希 */
  hash: string;
  /** 计划项列表 */
  items: PlanItem[];
  /** 创建时间 */
  createdAt: Date;
  /** 变更说明 */
  changeNote?: string;
  /** 变更类型 */
  changeType: "create" | "update" | "rollback" | "merge";
}

/** 计划差异 */
export interface PlanDiff {
  /** 新增项 */
  added: PlanItem[];
  /** 删除项 */
  removed: string[];
  /** 修改项 */
  modified: Array<{
    id: string;
    before: PlanItem;
    after: PlanItem;
    changes: string[];
  }>;
  /** 状态变更 */
  statusChanges: Array<{
    id: string;
    from: PlanItemStatus;
    to: PlanItemStatus;
  }>;
  /** 差异摘要 */
  summary: string;
}

/** 增量更新选项 */
export interface IncrementalUpdateOptions {
  /** 是否保留已完成项 */
  preserveCompleted: boolean;
  /** 是否合并相似项 */
  mergeSimilar: boolean;
  /** 相似度阈值 (0-1) */
  similarityThreshold: number;
  /** 是否自动调整优先级 */
  autoPrioritize: boolean;
  /** 最大历史版本数 */
  maxHistorySize: number;
}

const DEFAULT_OPTIONS: IncrementalUpdateOptions = {
  preserveCompleted: true,
  mergeSimilar: true,
  similarityThreshold: 0.7,
  autoPrioritize: true,
  maxHistorySize: 10,
};

/** 计划元数据 */
export interface PlanMetadata {
  /** 计划 ID */
  id: string;
  /** 计划名称 */
  name: string;
  /** 项目路径 */
  projectPath: string;
  /** 当前版本 */
  currentVersion: number;
  /** 创建时间 */
  createdAt: Date;
  /** 最后更新时间 */
  updatedAt: Date;
  /** 总项数 */
  totalItems: number;
  /** 已完成数 */
  completedItems: number;
  /** 进度百分比 */
  progress: number;
}

/** 完整计划 */
export interface Plan {
  /** 元数据 */
  metadata: PlanMetadata;
  /** 当前版本 */
  current: PlanVersion;
  /** 历史版本 */
  history: PlanVersion[];
  /** 更新选项 */
  options: IncrementalUpdateOptions;
}

export { DEFAULT_OPTIONS };
