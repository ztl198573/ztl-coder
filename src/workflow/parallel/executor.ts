/**
 * 并行执行引擎
 *
 * 支持多任务并行处理，提供并发控制和结果聚合
 */

/** 任务状态 */
export type TaskStatus = "pending" | "running" | "completed" | "failed" | "cancelled";

/** 任务定义 */
export interface TaskDefinition<T = unknown, R = unknown> {
  /** 任务 ID */
  id: string;
  /** 任务名称 */
  name: string;
  /** 任务执行器 */
  executor: (input: T) => Promise<R>;
  /** 输入数据 */
  input: T;
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 重试次数 */
  retries?: number;
  /** 优先级（越大越优先） */
  priority?: number;
  /** 依赖的任务 ID */
  dependsOn?: string[];
}

/** 任务结果 */
export interface TaskResult<R = unknown> {
  /** 任务 ID */
  taskId: string;
  /** 状态 */
  status: TaskStatus;
  /** 结果 */
  result?: R;
  /** 错误信息 */
  error?: string;
  /** 开始时间 */
  startTime: Date;
  /** 结束时间 */
  endTime?: Date;
  /** 执行时长（毫秒） */
  duration?: number;
  /** 重试次数 */
  retryCount: number;
}

/** 执行器配置 */
export interface ExecutorConfig {
  /** 最大并发数 */
  maxConcurrency: number;
  /** 默认超时时间（毫秒） */
  defaultTimeout: number;
  /** 失败时是否继续 */
  continueOnError: boolean;
  /** 进度回调间隔（毫秒） */
  progressInterval: number;
}

const DEFAULT_CONFIG: ExecutorConfig = {
  maxConcurrency: 4,
  defaultTimeout: 60000,
  continueOnError: true,
  progressInterval: 1000,
};

/** 执行进度 */
export interface ExecutionProgress {
  /** 总任务数 */
  total: number;
  /** 已完成数 */
  completed: number;
  /** 失败数 */
  failed: number;
  /** 正在运行数 */
  running: number;
  /** 等待中数 */
  pending: number;
  /** 完成百分比 */
  percentage: number;
  /** 预计剩余时间（毫秒） */
  estimatedRemaining?: number;
}

/** 进度回调 */
export type ProgressCallback = (progress: ExecutionProgress) => void;

/**
 * 延迟函数
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    const start = Date.now();
    const check = () => {
      if (Date.now() - start >= ms) {
        resolve();
      } else {
        setImmediate(check);
      }
    };
    check();
  });
}

/**
 * 创建并行执行器
 */
export function createParallelExecutor(config: Partial<ExecutorConfig> = {}) {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const tasks = new Map<string, TaskDefinition>();
  const results = new Map<string, TaskResult>();
  const running = new Set<string>();
  const completed = new Set<string>();
  const failed = new Set<string>();

  let progressCallback: ProgressCallback | null = null;

  return {
    /** 添加任务 */
    addTask<T, R>(task: TaskDefinition<T, R>): string {
      tasks.set(task.id, task as TaskDefinition);
      results.set(task.id, {
        taskId: task.id,
        status: "pending",
        startTime: new Date(),
        retryCount: 0,
      });
      return task.id;
    },

    /** 批量添加任务 */
    addTasks<T, R>(taskList: TaskDefinition<T, R>[]): string[] {
      return taskList.map((task) => this.addTask(task));
    },

    /** 设置进度回调 */
    onProgress(callback: ProgressCallback): void {
      progressCallback = callback;
    },

    /** 获取执行进度 */
    getProgress(): ExecutionProgress {
      const total = tasks.size;
      const completedCount = completed.size;
      const failedCount = failed.size;
      const runningCount = running.size;
      const pendingCount = total - completedCount - failedCount - runningCount;

      let estimatedRemaining: number | undefined;
      if (completedCount > 0) {
        const completedResults = Array.from(results.values()).filter(
          (r) => r.status === "completed" && r.duration,
        );
        if (completedResults.length > 0) {
          const avgDuration =
            completedResults.reduce((sum, r) => sum + (r.duration || 0), 0) / completedResults.length;
          estimatedRemaining = avgDuration * (pendingCount + runningCount);
        }
      }

      return {
        total,
        completed: completedCount,
        failed: failedCount,
        running: runningCount,
        pending: pendingCount,
        percentage: total > 0 ? Math.round((completedCount / total) * 100) : 0,
        estimatedRemaining,
      };
    },

    /** 执行单个任务 */
    async executeTask<T, R>(task: TaskDefinition<T, R>): Promise<TaskResult<R>> {
      const result: TaskResult<R> = {
        taskId: task.id,
        status: "running",
        startTime: new Date(),
        retryCount: 0,
      };

      running.add(task.id);

      const timeout = task.timeout || cfg.defaultTimeout;
      const retries = task.retries || 0;

      let lastError: string | undefined;

      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          const timeoutPromise = delay(timeout).then(() => {
            throw new Error("Timeout");
          });

          const output = await Promise.race([
            task.executor(task.input),
            timeoutPromise,
          ]);

          result.status = "completed";
          result.result = output as R;
          result.endTime = new Date();
          result.duration = result.endTime.getTime() - result.startTime.getTime();

          running.delete(task.id);
          completed.add(task.id);
          results.set(task.id, result);

          return result;
        } catch (error) {
          lastError = error instanceof Error ? error.message : String(error);
          result.retryCount = attempt + 1;

          if (attempt < retries) {
            await delay(1000 * (attempt + 1));
          }
        }
      }

      result.status = "failed";
      result.error = lastError;
      result.endTime = new Date();
      result.duration = result.endTime.getTime() - result.startTime.getTime();

      running.delete(task.id);
      failed.add(task.id);
      results.set(task.id, result);

      return result;
    },

    /** 执行所有任务 */
    async executeAll(): Promise<Map<string, TaskResult>> {
      const dependencyGraph = new Map<string, string[]>();
      for (const [id, task] of tasks) {
        dependencyGraph.set(id, task.dependsOn || []);
      }

      const getExecutableTasks = (): string[] => {
        const executable: string[] = [];
        for (const [id] of tasks) {
          if (completed.has(id) || failed.has(id) || running.has(id)) continue;

          const deps = dependencyGraph.get(id) || [];
          const depsMet = deps.every((depId) => completed.has(depId));

          if (depsMet) {
            executable.push(id);
          }
        }
        return executable.sort((a, b) => {
          const priorityA = tasks.get(a)?.priority || 0;
          const priorityB = tasks.get(b)?.priority || 0;
          return priorityB - priorityA;
        });
      };

      const activePromises: Promise<void>[] = [];

      while (completed.size + failed.size < tasks.size) {
        const executable = getExecutableTasks();

        if (executable.length === 0) {
          break;
        }

        while (running.size < cfg.maxConcurrency && executable.length > 0) {
          const taskId = executable.shift()!;
          const task = tasks.get(taskId)!;

          const promise = this.executeTask(task).then(() => {});

          activePromises.push(promise);
        }

        if (running.size >= cfg.maxConcurrency || executable.length === 0) {
          await Promise.race(activePromises);
        }

        if (!cfg.continueOnError && failed.size > 0) {
          break;
        }

        // 进度回调
        if (progressCallback) {
          progressCallback(this.getProgress());
        }
      }

      await Promise.all(activePromises);

      if (progressCallback) {
        progressCallback(this.getProgress());
      }

      return results;
    },

    /** 取消任务 */
    cancel(taskId: string): boolean {
      const result = results.get(taskId);
      if (!result || result.status !== "pending") {
        return false;
      }

      result.status = "cancelled";
      result.endTime = new Date();
      return true;
    },

    /** 取消所有任务 */
    cancelAll(): number {
      let cancelled = 0;
      for (const [, result] of results) {
        if (result.status === "pending") {
          result.status = "cancelled";
          result.endTime = new Date();
          cancelled++;
        }
      }
      return cancelled;
    },

    /** 获取任务结果 */
    getResult<R>(taskId: string): TaskResult<R> | undefined {
      return results.get(taskId) as TaskResult<R> | undefined;
    },

    /** 获取所有结果 */
    getAllResults(): Map<string, TaskResult> {
      return new Map(results);
    },

    /** 清理 */
    clear(): void {
      tasks.clear();
      results.clear();
      running.clear();
      completed.clear();
      failed.clear();
    },
  };
}

/** 类型导出 */
export type ParallelExecutor = ReturnType<typeof createParallelExecutor>;

/**
 * 便捷函数：并行执行多个任务
 */
export async function parallelExecute<T, R>(
  taskList: TaskDefinition<T, R>[],
  options?: Partial<ExecutorConfig>,
): Promise<Map<string, TaskResult<R>>> {
  const executor = createParallelExecutor(options);
  executor.addTasks(taskList);
  const results = await executor.executeAll();
  // Cast is safe because we added typed tasks
  return results as Map<string, TaskResult<R>>;
}
