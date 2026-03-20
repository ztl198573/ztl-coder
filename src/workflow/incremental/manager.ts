/**
 * 增量计划管理器
 *
 * 支持计划的增量更新、差异检测和版本管理
 */

import type {
  Plan,
  PlanItem,
  PlanVersion,
  PlanDiff,
  PlanMetadata,
  IncrementalUpdateOptions,
} from "./types.ts";
import { DEFAULT_OPTIONS } from "./types.ts";

/** 计算内容哈希 */
function calculateHash(items: PlanItem[]): string {
  const content = JSON.stringify(
    items.map((i) => ({
      id: i.id,
      title: i.title,
      status: i.status,
      priority: i.priority,
    })),
  );
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash).toString(16);
}

/** 计算两个字符串的相似度 */
function calculateSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/\s+/));
  const wordsB = new Set(b.toLowerCase().split(/\s+/));
  const intersection = new Set([...wordsA].filter((x) => wordsB.has(x)));
  const union = new Set([...wordsA, ...wordsB]);
  return intersection.size / union.size;
}

/** 生成唯一 ID */
function generateId(): string {
  return `item_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * 创建增量计划管理器
 */
export function createIncrementalPlanManager(
  options: Partial<IncrementalUpdateOptions> = {},
) {
  const opts: IncrementalUpdateOptions = { ...DEFAULT_OPTIONS, ...options };
  let plan: Plan | null = null;

  return {
    /** 创建新计划 */
    createPlan(
      name: string,
      projectPath: string,
      items: Omit<PlanItem, "id" | "createdAt" | "updatedAt">[],
    ): Plan {
      const now = new Date();
      const planItems: PlanItem[] = items.map((item) => ({
        ...item,
        id: generateId(),
        createdAt: now,
        updatedAt: now,
      }));

      const version: PlanVersion = {
        version: 1,
        hash: calculateHash(planItems),
        items: planItems,
        createdAt: now,
        changeType: "create",
        changeNote: "初始计划创建",
      };

      const metadata: PlanMetadata = {
        id: `plan_${Date.now()}`,
        name,
        projectPath,
        currentVersion: 1,
        createdAt: now,
        updatedAt: now,
        totalItems: planItems.length,
        completedItems: 0,
        progress: 0,
      };

      plan = {
        metadata,
        current: version,
        history: [],
        options: opts,
      };

      return plan;
    },

    /** 获取当前计划 */
    getPlan(): Plan | null {
      return plan;
    },

    /** 计算差异 */
    calculateDiff(newItems: PlanItem[]): PlanDiff {
      if (!plan) {
        return {
          added: newItems,
          removed: [],
          modified: [],
          statusChanges: [],
          summary: `新增 ${newItems.length} 个计划项`,
        };
      }

      const oldItems = plan.current.items;
      const oldMap = new Map(oldItems.map((i) => [i.id, i]));
      const newMap = new Map(newItems.map((i) => [i.id, i]));

      const added: PlanItem[] = [];
      const removed: string[] = [];
      const modified: Array<{
        id: string;
        before: PlanItem;
        after: PlanItem;
        changes: string[];
      }> = [];
      const statusChanges: Array<{
        id: string;
        from: PlanItem["status"];
        to: PlanItem["status"];
      }> = [];

      // 查找新增和修改
      for (const newItem of newItems) {
        const oldItem = oldMap.get(newItem.id);
        if (!oldItem) {
          added.push(newItem);
        } else {
          const changes: string[] = [];
          if (oldItem.title !== newItem.title) changes.push("标题变更");
          if (oldItem.description !== newItem.description) changes.push("描述变更");
          if (oldItem.priority !== newItem.priority) changes.push("优先级变更");
          if (oldItem.status !== newItem.status) {
            changes.push("状态变更");
            statusChanges.push({
              id: newItem.id,
              from: oldItem.status,
              to: newItem.status,
            });
          }

          if (changes.length > 0) {
            modified.push({
              id: newItem.id,
              before: oldItem,
              after: newItem,
              changes,
            });
          }
        }
      }

      // 查找删除
      for (const [id] of oldMap) {
        if (!newMap.has(id)) {
          // 检查是否保留已完成项
          if (opts.preserveCompleted && oldMap.get(id)?.status === "completed") {
            continue;
          }
          removed.push(id);
        }
      }

      // 生成摘要
      const parts: string[] = [];
      if (added.length > 0) parts.push(`新增 ${added.length} 项`);
      if (removed.length > 0) parts.push(`删除 ${removed.length} 项`);
      if (modified.length > 0) parts.push(`修改 ${modified.length} 项`);
      if (statusChanges.length > 0) parts.push(`${statusChanges.length} 项状态变更`);

      return {
        added,
        removed,
        modified,
        statusChanges,
        summary: parts.length > 0 ? parts.join("，") : "无变更",
      };
    },

    /** 增量更新计划 */
    updatePlan(
      newItems: Omit<PlanItem, "createdAt" | "updatedAt">[],
      changeNote?: string,
    ): Plan | null {
      if (!plan) return null;

      const now = new Date();
      const oldItems = plan.current.items;
      const oldMap = new Map(oldItems.map((i) => [i.id, i]));

      // 构建新的计划项列表
      const updatedItems: PlanItem[] = [];
      const addedIds = new Set<string>();

      // 处理新项
      for (const item of newItems) {
        const existing = oldMap.get(item.id);
        if (existing) {
          // 更新现有项
          updatedItems.push({
            ...existing,
            ...item,
            updatedAt: now,
            completedAt:
              item.status === "completed" && existing.status !== "completed"
                ? now
                : existing.completedAt,
          });
        } else {
          // 新增项
          addedIds.add(item.id);
          updatedItems.push({
            ...item,
            id: item.id || generateId(),
            createdAt: now,
            updatedAt: now,
          } as PlanItem);
        }
      }

      // 保留已完成项（如果配置了）
      if (opts.preserveCompleted) {
        for (const oldItem of oldItems) {
          if (oldItem.status === "completed" && !updatedItems.find((i) => i.id === oldItem.id)) {
            updatedItems.push(oldItem);
          }
        }
      }

      // 合并相似项
      if (opts.mergeSimilar) {
        const merged: PlanItem[] = [];
        const mergedIds = new Set<string>();

        for (const item of updatedItems) {
          if (mergedIds.has(item.id)) continue;

          const similar = updatedItems.filter(
            (other) =>
              other.id !== item.id &&
              !mergedIds.has(other.id) &&
              calculateSimilarity(item.title, other.title) >= opts.similarityThreshold,
          );

          if (similar.length > 0) {
            // 合并到第一个
            mergedIds.add(item.id);
            for (const s of similar) {
              mergedIds.add(s.id);
            }
            merged.push({
              ...item,
              notes: [item.notes, ...similar.map((s) => s.notes)]
                .filter(Boolean)
                .join("\n"),
            });
          } else {
            merged.push(item);
          }
        }

        if (merged.length < updatedItems.length) {
          updatedItems.length = 0;
          updatedItems.push(...merged);
        }
      }

      // 自动调整优先级
      if (opts.autoPrioritize) {
        updatedItems.sort((a, b) => {
          // 未完成优先
          if (a.status !== "completed" && b.status === "completed") return -1;
          if (a.status === "completed" && b.status !== "completed") return 1;
          // 然后按优先级
          return b.priority - a.priority;
        });
      }

      // 创建新版本
      const newVersion: PlanVersion = {
        version: plan.current.version + 1,
        hash: calculateHash(updatedItems),
        items: updatedItems,
        createdAt: now,
        changeType: "update",
        changeNote,
      };

      // 更新历史
      const history = [...plan.history, plan.current];
      if (history.length > opts.maxHistorySize) {
        history.shift();
      }

      // 更新元数据
      const completedCount = updatedItems.filter((i) => i.status === "completed").length;

      plan = {
        metadata: {
          ...plan.metadata,
          currentVersion: newVersion.version,
          updatedAt: now,
          totalItems: updatedItems.length,
          completedItems: completedCount,
          progress:
            updatedItems.length > 0
              ? Math.round((completedCount / updatedItems.length) * 100)
              : 0,
        },
        current: newVersion,
        history,
        options: opts,
      };

      return plan;
    },

    /** 回滚到指定版本 */
    rollback(version: number): Plan | null {
      if (!plan) return null;

      const targetVersion = plan.history.find((v) => v.version === version);
      if (!targetVersion) return null;

      const now = new Date();

      plan = {
        ...plan,
        current: {
          ...targetVersion,
          version: plan.current.version + 1,
          createdAt: now,
          changeType: "rollback",
          changeNote: `回滚到版本 ${version}`,
        },
        metadata: {
          ...plan.metadata,
          updatedAt: now,
          currentVersion: plan.current.version + 1,
        },
      };

      return plan;
    },

    /** 更新单项状态 */
    updateItemStatus(itemId: string, status: PlanItem["status"]): PlanItem | null {
      if (!plan) return null;

      const item = plan.current.items.find((i) => i.id === itemId);
      if (!item) return null;

      const now = new Date();
      item.status = status;
      item.updatedAt = now;
      if (status === "completed") {
        item.completedAt = now;
      }

      // 更新进度
      const completedCount = plan.current.items.filter(
        (i) => i.status === "completed",
      ).length;
      plan.metadata.completedItems = completedCount;
      plan.metadata.progress = Math.round(
        (completedCount / plan.current.items.length) * 100,
      );
      plan.metadata.updatedAt = now;

      return item;
    },

    /** 获取下一个待处理项 */
    getNextItem(): PlanItem | null {
      if (!plan) return null;

      const pending = plan.current.items
        .filter((i) => i.status === "pending")
        .sort((a, b) => b.priority - a.priority);

      if (pending.length === 0) return null;

      // 检查依赖
      for (const item of pending) {
        const deps = item.dependsOn || [];
        const depsMet = deps.every((depId) => {
          const dep = plan!.current.items.find((i) => i.id === depId);
          return dep?.status === "completed";
        });

        if (depsMet) {
          return item;
        }
      }

      // 没有满足依赖的项，返回优先级最高的
      return pending[0];
    },

    /** 获取阻塞项 */
    getBlockedItems(): PlanItem[] {
      if (!plan) return [];

      return plan.current.items.filter((item) => {
        if (item.status !== "pending") return false;
        const deps = item.dependsOn || [];
        return !deps.every((depId) => {
          const dep = plan!.current.items.find((i) => i.id === depId);
          return dep?.status === "completed";
        });
      });
    },

    /** 生成计划报告 */
    generateReport(): string {
      if (!plan) return "# 无活动计划\n";

      const { metadata, current } = plan;
      let report = `# 计划报告: ${metadata.name}\n\n`;
      report += `**版本:** ${current.version}\n`;
      report += `**进度:** ${metadata.progress}% (${metadata.completedItems}/${metadata.totalItems})\n`;
      report += `**更新时间:** ${metadata.updatedAt.toLocaleString("zh-CN")}\n\n`;

      // 统计
      const statusCount = new Map<PlanItem["status"], number>();
      for (const item of current.items) {
        statusCount.set(item.status, (statusCount.get(item.status) || 0) + 1);
      }

      report += `## 统计\n\n`;
      report += `| 状态 | 数量 |\n|------|------|\n`;
      for (const [status, count] of statusCount) {
        report += `| ${status} | ${count} |\n`;
      }

      // 待处理项
      const pending = current.items.filter((i) => i.status === "pending");
      if (pending.length > 0) {
        report += `\n## 待处理 (${pending.length})\n\n`;
        for (const item of pending.sort((a, b) => b.priority - a.priority)) {
          report += `- [ ] **${item.title}** (优先级: ${item.priority})\n`;
          if (item.description) {
            report += `  ${item.description}\n`;
          }
        }
      }

      // 进行中
      const inProgress = current.items.filter((i) => i.status === "in_progress");
      if (inProgress.length > 0) {
        report += `\n## 进行中 (${inProgress.length})\n\n`;
        for (const item of inProgress) {
          report += `- [~] **${item.title}**\n`;
        }
      }

      // 已完成
      const completed = current.items.filter((i) => i.status === "completed");
      if (completed.length > 0) {
        report += `\n## 已完成 (${completed.length})\n\n`;
        for (const item of completed) {
          report += `- [x] **${item.title}**\n`;
        }
      }

      return report;
    },

    /** 保存计划 */
    async save(path: string): Promise<void> {
      if (!plan) throw new Error("No plan to save");

      const data = JSON.stringify(plan, null, 2);
      await Bun.write(path, data);
    },

    /** 加载计划 */
    async load(path: string): Promise<Plan | null> {
      try {
        const file = Bun.file(path);
        const data = await file.json();
        plan = data as Plan;
        return plan;
      } catch {
        return null;
      }
    },

    /** 清理计划 */
    clear(): void {
      plan = null;
    },
  };
}

export type IncrementalPlanManager = ReturnType<typeof createIncrementalPlanManager>;
