/**
 * 并行执行模块
 */

export {
  createParallelExecutor,
  parallelExecute,
  type TaskDefinition,
  type TaskResult,
  type TaskStatus,
  type ExecutorConfig,
  type ExecutionProgress,
  type ProgressCallback,
} from "./executor.ts";
