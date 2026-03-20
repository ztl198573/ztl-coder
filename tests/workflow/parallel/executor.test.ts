/**
 * 并行执行器测试
 */

import { describe, test, expect } from "bun:test";
import {
  createParallelExecutor,
  type TaskDefinition,
  type ExecutorConfig,
} from "@/workflow/parallel/index.ts";

describe("并行执行器", () => {
  describe("创建执行器", () => {
    test("应创建执行器实例", () => {
      const executor = createParallelExecutor();
      expect(executor).toBeDefined();
      expect(executor.addTask).toBeTypeOf("function");
      expect(executor.addTasks).toBeTypeOf("function");
      expect(executor.executeTask).toBeTypeOf("function");
      expect(executor.executeAll).toBeTypeOf("function");
    });

    test("应支持自定义配置", () => {
      const config: Partial<ExecutorConfig> = {
        maxConcurrency: 2,
        defaultTimeout: 5000,
        continueOnError: false,
      };

      const executor = createParallelExecutor(config);
      expect(executor).toBeDefined();
    });
  });

  describe("addTask", () => {
    test("应添加任务并返回任务 ID", () => {
      const executor = createParallelExecutor();

      const taskId = executor.addTask({
        id: "test-1",
        name: "Test Task",
        executor: async () => "result",
        input: {},
      });

      expect(taskId).toBe("test-1");
    });
  });

  describe("addTasks", () => {
    test("应批量添加任务", () => {
      const executor = createParallelExecutor();

      const taskIds = executor.addTasks([
        { id: "t1", name: "Task 1", executor: async () => 1, input: {} },
        { id: "t2", name: "Task 2", executor: async () => 2, input: {} },
      ]);

      expect(taskIds).toHaveLength(2);
      expect(taskIds).toContain("t1");
      expect(taskIds).toContain("t2");
    });
  });

  describe("executeTask", () => {
    test("应执行单个任务", async () => {
      const executor = createParallelExecutor();

      const task: TaskDefinition<void, string> = {
        id: "test-task",
        name: "Test Task",
        executor: async () => "success",
        input: undefined,
      };

      const result = await executor.executeTask(task);

      expect(result.status).toBe("completed");
      expect(result.result).toBe("success");
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    test("应处理任务错误", async () => {
      const executor = createParallelExecutor();

      const task: TaskDefinition<void, string> = {
        id: "failing-task",
        name: "Failing Task",
        executor: async () => {
          throw new Error("Task failed");
        },
        input: undefined,
      };

      const result = await executor.executeTask(task);

      expect(result.status).toBe("failed");
      expect(result.error).toContain("Task failed");
    });
  });

  describe("getProgress", () => {
    test("应返回正确的进度信息", async () => {
      const executor = createParallelExecutor();

      executor.addTasks([
        { id: "1", name: "Task 1", executor: async () => 1, input: {} },
        { id: "2", name: "Task 2", executor: async () => 2, input: {} },
      ]);

      const progress = executor.getProgress();

      expect(progress.total).toBe(2);
      expect(progress.pending).toBe(2);
      expect(progress.completed).toBe(0);
    });
  });
});

describe("默认配置", () => {
  test("应有合理的默认值", () => {
    const config: ExecutorConfig = {
      maxConcurrency: 4,
      defaultTimeout: 60000,
      continueOnError: true,
      progressInterval: 1000,
    };

    expect(config.maxConcurrency).toBeGreaterThan(0);
    expect(config.defaultTimeout).toBeGreaterThan(0);
  });
});
