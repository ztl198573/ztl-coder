/**
 * 增量计划管理器测试
 */

import { describe, test, expect, beforeEach } from "bun:test";
import {
  createIncrementalPlanManager,
  DEFAULT_OPTIONS,
  type PlanItem,
} from "@/workflow/incremental/index.ts";

describe("增量计划管理器", () => {
  let manager: ReturnType<typeof createIncrementalPlanManager>;

  beforeEach(() => {
    manager = createIncrementalPlanManager();
  });

  describe("createPlan", () => {
    test("应该创建包含正确元数据的计划", () => {
      const items = [
        { title: "任务 1", status: "pending" as const, priority: 1 },
        { title: "任务 2", status: "pending" as const, priority: 2 },
      ];

      const plan = manager.createPlan("测试计划", "/project/path", items);

      expect(plan.metadata.name).toBe("测试计划");
      expect(plan.metadata.projectPath).toBe("/project/path");
      expect(plan.metadata.currentVersion).toBe(1);
      expect(plan.metadata.totalItems).toBe(2);
      expect(plan.metadata.completedItems).toBe(0);
      expect(plan.metadata.progress).toBe(0);
      expect(plan.current.items).toHaveLength(2);
      expect(plan.current.changeType).toBe("create");
    });

    test("应该为每个计划项生成唯一 ID", () => {
      const items = [
        { title: "任务 A", status: "pending" as const, priority: 1 },
        { title: "任务 B", status: "pending" as const, priority: 1 },
      ];

      const plan = manager.createPlan("测试", "/path", items);
      const ids = plan.current.items.map((i) => i.id);

      expect(ids[0]).not.toBe(ids[1]);
      expect(ids[0]).toMatch(/^item_\d+_/);
    });
  });

  describe("getPlan", () => {
    test("初始状态应返回 null", () => {
      expect(manager.getPlan()).toBeNull();
    });

    test("创建计划后应返回计划", () => {
      manager.createPlan("测试", "/path", []);
      expect(manager.getPlan()).not.toBeNull();
    });
  });

  describe("calculateDiff", () => {
    test("无计划时应返回所有项为新增", () => {
      const newItems: PlanItem[] = [
        {
          id: "1",
          title: "新任务",
          status: "pending",
          priority: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const diff = manager.calculateDiff(newItems);

      expect(diff.added).toHaveLength(1);
      expect(diff.removed).toHaveLength(0);
      expect(diff.modified).toHaveLength(0);
      expect(diff.summary).toContain("新增");
    });

    test("应正确检测新增项", () => {
      manager.createPlan("测试", "/path", [
        { title: "现有任务", status: "pending", priority: 1 },
      ]);

      const existingItem = manager.getPlan()!.current.items[0];
      const newItems: PlanItem[] = [
        existingItem,
        {
          id: "new",
          title: "新任务",
          status: "pending",
          priority: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const diff = manager.calculateDiff(newItems);

      expect(diff.added).toHaveLength(1);
      expect(diff.added[0].title).toBe("新任务");
    });

    test("应正确检测删除项", () => {
      manager.createPlan("测试", "/path", [
        { title: "任务 1", status: "pending", priority: 1 },
        { title: "任务 2", status: "pending", priority: 2 },
      ]);

      const items = manager.getPlan()!.current.items;
      const diff = manager.calculateDiff([items[0]]); // 只保留第一个

      expect(diff.removed).toHaveLength(1);
    });

    test("应正确检测修改项", () => {
      manager.createPlan("测试", "/path", [
        { title: "原标题", status: "pending", priority: 1 },
      ]);

      const item = manager.getPlan()!.current.items[0];
      const modifiedItem: PlanItem = {
        ...item,
        title: "新标题",
      };

      const diff = manager.calculateDiff([modifiedItem]);

      expect(diff.modified).toHaveLength(1);
      expect(diff.modified[0].changes).toContain("标题变更");
    });

    test("应正确检测状态变更", () => {
      manager.createPlan("测试", "/path", [
        { title: "任务", status: "pending", priority: 1 },
      ]);

      const item = manager.getPlan()!.current.items[0];
      const completedItem: PlanItem = {
        ...item,
        status: "completed",
      };

      const diff = manager.calculateDiff([completedItem]);

      expect(diff.statusChanges).toHaveLength(1);
      expect(diff.statusChanges[0].from).toBe("pending");
      expect(diff.statusChanges[0].to).toBe("completed");
    });
  });

  describe("updatePlan", () => {
    test("应更新计划并增加版本号", () => {
      manager.createPlan("测试", "/path", [
        { title: "任务", status: "pending", priority: 1 },
      ]);

      const item = manager.getPlan()!.current.items[0];
      manager.updatePlan([{ ...item, status: "completed" }], "完成任务");

      const plan = manager.getPlan()!;
      expect(plan.metadata.currentVersion).toBe(2);
      expect(plan.current.changeType).toBe("update");
      expect(plan.current.changeNote).toBe("完成任务");
    });

    test("应正确更新进度", () => {
      manager.createPlan("测试", "/path", [
        { title: "任务 1", status: "pending", priority: 1 },
        { title: "任务 2", status: "pending", priority: 2 },
      ]);

      const items = manager.getPlan()!.current.items;
      manager.updatePlan([
        { ...items[0], status: "completed" },
        items[1],
      ]);

      const plan = manager.getPlan()!;
      expect(plan.metadata.completedItems).toBe(1);
      expect(plan.metadata.progress).toBe(50);
    });

    test("应保留历史版本", () => {
      manager.createPlan("测试", "/path", [
        { title: "任务", status: "pending", priority: 1 },
      ]);

      const item = manager.getPlan()!.current.items[0];
      manager.updatePlan([{ ...item, status: "completed" }]);

      const plan = manager.getPlan()!;
      expect(plan.history).toHaveLength(1);
      expect(plan.history[0].version).toBe(1);
    });
  });

  describe("updateItemStatus", () => {
    test("应更新单项状态", () => {
      manager.createPlan("测试", "/path", [
        { title: "任务", status: "pending", priority: 1 },
      ]);

      const itemId = manager.getPlan()!.current.items[0].id;
      const updated = manager.updateItemStatus(itemId, "in_progress");

      expect(updated).not.toBeNull();
      expect(updated!.status).toBe("in_progress");
    });

    test("应在完成时设置 completedAt", () => {
      manager.createPlan("测试", "/path", [
        { title: "任务", status: "pending", priority: 1 },
      ]);

      const itemId = manager.getPlan()!.current.items[0].id;
      const updated = manager.updateItemStatus(itemId, "completed");

      expect(updated!.completedAt).toBeDefined();
    });

    test("无效 ID 应返回 null", () => {
      manager.createPlan("测试", "/path", []);
      const result = manager.updateItemStatus("invalid-id", "completed");
      expect(result).toBeNull();
    });
  });

  describe("getNextItem", () => {
    test("应返回优先级最高的待处理项", () => {
      manager.createPlan("测试", "/path", [
        { title: "低优先级", status: "pending", priority: 1 },
        { title: "高优先级", status: "pending", priority: 3 },
        { title: "中优先级", status: "pending", priority: 2 },
      ]);

      const next = manager.getNextItem();
      expect(next!.title).toBe("高优先级");
    });

    test("应跳过已完成的项", () => {
      manager.createPlan("测试", "/path", [
        { title: "已完成", status: "completed", priority: 10 },
        { title: "待处理", status: "pending", priority: 1 },
      ]);

      const next = manager.getNextItem();
      expect(next!.title).toBe("待处理");
    });

    test("应检查依赖关系", () => {
      const items = [
        { title: "任务 A", status: "pending", priority: 2 },
        { title: "任务 B", status: "pending", priority: 1 },
      ];
      manager.createPlan("测试", "/path", items);

      const planItems = manager.getPlan()!.current.items;
      // 任务 B 依赖任务 A
      manager.updatePlan([
        planItems[0],
        { ...planItems[1], dependsOn: [planItems[0].id] },
      ]);

      // 任务 A 应该先执行（即使优先级更低）
      const next = manager.getNextItem();
      expect(next!.title).toBe("任务 A");
    });
  });

  describe("getBlockedItems", () => {
    test("应返回被阻塞的项", () => {
      manager.createPlan("测试", "/path", [
        { title: "任务 A", status: "pending", priority: 1 },
        { title: "任务 B", status: "pending", priority: 2 },
      ]);

      const items = manager.getPlan()!.current.items;
      manager.updatePlan([
        items[0],
        { ...items[1], dependsOn: [items[0].id] },
      ]);

      const blocked = manager.getBlockedItems();
      expect(blocked).toHaveLength(1);
      expect(blocked[0].title).toBe("任务 B");
    });

    test("依赖已完成时不应被阻塞", () => {
      manager.createPlan("测试", "/path", [
        { title: "任务 A", status: "completed", priority: 1 },
        { title: "任务 B", status: "pending", priority: 2 },
      ]);

      const items = manager.getPlan()!.current.items;
      manager.updatePlan([
        items[0],
        { ...items[1], dependsOn: [items[0].id] },
      ]);

      const blocked = manager.getBlockedItems();
      expect(blocked).toHaveLength(0);
    });
  });

  describe("rollback", () => {
    test("应回滚到指定版本", () => {
      manager.createPlan("测试", "/path", [
        { title: "任务", status: "pending", priority: 1 },
      ]);

      const item = manager.getPlan()!.current.items[0];
      manager.updatePlan([{ ...item, status: "completed" }]);

      // 回滚到版本 1
      const result = manager.rollback(1);

      expect(result).not.toBeNull();
      expect(result!.current.changeType).toBe("rollback");
      expect(result!.current.items[0].status).toBe("pending");
    });

    test("无效版本号应返回 null", () => {
      manager.createPlan("测试", "/path", []);
      const result = manager.rollback(999);
      expect(result).toBeNull();
    });
  });

  describe("generateReport", () => {
    test("无计划时应返回空报告", () => {
      const report = manager.generateReport();
      expect(report).toContain("无活动计划");
    });

    test("应生成包含统计信息的报告", () => {
      manager.createPlan("测试计划", "/path", [
        { title: "待处理", status: "pending", priority: 1 },
        { title: "进行中", status: "in_progress", priority: 2 },
        { title: "已完成", status: "completed", priority: 3 },
      ]);

      const report = manager.generateReport();

      expect(report).toContain("测试计划");
      expect(report).toContain("33%"); // 1/3 完成
      expect(report).toContain("待处理");
      expect(report).toContain("进行中");
      expect(report).toContain("已完成");
    });
  });

  describe("save/load", () => {
    test("应能保存和加载计划", async () => {
      manager.createPlan("测试", "/path", [
        { title: "任务", status: "pending", priority: 1 },
      ]);

      const tempPath = `/tmp/test-plan-${Date.now()}.json`;
      await manager.save(tempPath);

      // 创建新管理器并加载
      const newManager = createIncrementalPlanManager();
      const loaded = await newManager.load(tempPath);

      expect(loaded).not.toBeNull();
      expect(loaded!.metadata.name).toBe("测试");
      expect(loaded!.current.items).toHaveLength(1);

      // 清理
      await Bun.file(tempPath).delete();
    });
  });

  describe("clear", () => {
    test("应清除当前计划", () => {
      manager.createPlan("测试", "/path", []);
      manager.clear();
      expect(manager.getPlan()).toBeNull();
    });
  });
});

describe("默认选项", () => {
  test("应有合理的默认值", () => {
    expect(DEFAULT_OPTIONS.preserveCompleted).toBe(true);
    expect(DEFAULT_OPTIONS.mergeSimilar).toBe(true);
    expect(DEFAULT_OPTIONS.similarityThreshold).toBe(0.7);
    expect(DEFAULT_OPTIONS.autoPrioritize).toBe(true);
    expect(DEFAULT_OPTIONS.maxHistorySize).toBe(10);
  });
});
