/**
 * 进度追踪器
 *
 * 用于在 Ledger 中可视化任务进度
 */

import { $ } from "bun";

/** 任务状态 */
export type TaskStatus = "pending" | "in_progress" | "completed" | "failed" | "blocked";

/** 进度信息 */
export interface ProgressInfo {
  /** 任务 ID */
  taskId: string;
  /** 任务名称 */
  name: string;
  /** 当前状态 */
  status: TaskStatus;
  /** 完成百分比 (0-100) */
  percentage: number;
  /** 已完成步骤数 */
  completedSteps: number;
  /** 总步骤数 */
  totalSteps: number;
  /** 开始时间 */
  startTime: Date | null;
  /** 预计完成时间 */
  estimatedEndTime: Date | null;
  /** 实际结束时间 */
  endTime: Date | null;
  /** 错误信息 */
  errorMessage: string | null;
  /** 子任务 */
  subtasks: ProgressInfo[];
}

/** 进度追踪器配置 */
export interface ProgressTrackerConfig {
  /** Ledger 文件路径 */
  ledgerPath: string;
  /** 更新间隔（毫秒） */
  updateInterval: number;
  /** 是否自动保存 */
  autoSave: boolean;
}

const DEFAULT_CONFIG: ProgressTrackerConfig = {
  ledgerPath: "thoughts/ledgers/progress.md",
  updateInterval: 5000,
  autoSave: true,
};

/**
 * 进度追踪器类
 */
export class ProgressTracker {
  private tasks: Map<string, ProgressInfo> = new Map();
  private config: ProgressTrackerConfig;
  private saveTimer: Timer | null = null;

  constructor(config: Partial<ProgressTrackerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 创建新任务
   */
  createTask(
    taskId: string,
    name: string,
    totalSteps: number = 1,
  ): ProgressInfo {
    const task: ProgressInfo = {
      taskId,
      name,
      status: "pending",
      percentage: 0,
      completedSteps: 0,
      totalSteps,
      startTime: null,
      estimatedEndTime: null,
      endTime: null,
      errorMessage: null,
      subtasks: [],
    };

    this.tasks.set(taskId, task);
    this.scheduleSave();

    return task;
  }

  /**
   * 开始任务
   */
  startTask(taskId: string): ProgressInfo | null {
    const task = this.tasks.get(taskId);
    if (!task) return null;

    task.status = "in_progress";
    task.startTime = new Date();

    // 估算完成时间
    if (task.totalSteps > 0) {
      const avgStepTime = 5 * 60 * 1000; // 假设每步 5 分钟
      const remainingSteps = task.totalSteps - task.completedSteps;
      task.estimatedEndTime = new Date(Date.now() + remainingSteps * avgStepTime);
    }

    this.scheduleSave();
    return task;
  }

  /**
   * 更新任务进度
   */
  updateProgress(
    taskId: string,
    completedSteps: number,
    totalSteps?: number,
  ): ProgressInfo | null {
    const task = this.tasks.get(taskId);
    if (!task) return null;

    task.completedSteps = completedSteps;
    if (totalSteps !== undefined) {
      task.totalSteps = totalSteps;
    }

    // 计算百分比
    task.percentage = task.totalSteps > 0
      ? Math.round((task.completedSteps / task.totalSteps) * 100)
      : 0;

    // 更新预估时间
    if (task.startTime && task.completedSteps > 0 && task.totalSteps > task.completedSteps) {
      const elapsed = Date.now() - task.startTime.getTime();
      const avgStepTime = elapsed / task.completedSteps;
      const remainingSteps = task.totalSteps - task.completedSteps;
      task.estimatedEndTime = new Date(Date.now() + remainingSteps * avgStepTime);
    }

    this.scheduleSave();
    return task;
  }

  /**
   * 完成任务
   */
  completeTask(taskId: string): ProgressInfo | null {
    const task = this.tasks.get(taskId);
    if (!task) return null;

    task.status = "completed";
    task.percentage = 100;
    task.completedSteps = task.totalSteps;
    task.endTime = new Date();

    this.scheduleSave();
    return task;
  }

  /**
   * 标记任务失败
   */
  failTask(taskId: string, errorMessage: string): ProgressInfo | null {
    const task = this.tasks.get(taskId);
    if (!task) return null;

    task.status = "failed";
    task.endTime = new Date();
    task.errorMessage = errorMessage;

    this.scheduleSave();
    return task;
  }

  /**
   * 标记任务阻塞
   */
  blockTask(taskId: string, reason: string): ProgressInfo | null {
    const task = this.tasks.get(taskId);
    if (!task) return null;

    task.status = "blocked";
    task.errorMessage = reason;

    this.scheduleSave();
    return task;
  }

  /**
   * 添加子任务
   */
  addSubtask(parentTaskId: string, subtask: ProgressInfo): void {
    const task = this.tasks.get(parentTaskId);
    if (!task) return;

    task.subtasks.push(subtask);
    this.scheduleSave();
  }

  /**
   * 获取任务信息
   */
  getTask(taskId: string): ProgressInfo | null {
    return this.tasks.get(taskId) || null;
  }

  /**
   * 获取所有任务
   */
  getAllTasks(): ProgressInfo[] {
    return Array.from(this.tasks.values());
  }

  /**
   * 生成进度条
   */
  generateProgressBar(percentage: number, width: number = 20): string {
    const filled = Math.round((percentage / 100) * width);
    const empty = width - filled;
    const bar = "█".repeat(filled) + "░".repeat(empty);
    return `[${bar}] ${percentage}%`;
  }

  /**
   * 生成状态图标
   */
  getStatusIcon(status: TaskStatus): string {
    const icons: Record<TaskStatus, string> = {
      pending: "⏳",
      in_progress: "🔄",
      completed: "✅",
      failed: "❌",
      blocked: "🚫",
    };
    return icons[status];
  }

  /**
   * 生成 Markdown 报告
   */
  generateMarkdownReport(): string {
    const tasks = this.getAllTasks();
    let report = "# 任务进度追踪\n\n";
    report += `**更新时间:** ${new Date().toLocaleString("zh-CN")}\n\n`;

    // 统计信息
    const stats = {
      total: tasks.length,
      pending: tasks.filter((t) => t.status === "pending").length,
      inProgress: tasks.filter((t) => t.status === "in_progress").length,
      completed: tasks.filter((t) => t.status === "completed").length,
      failed: tasks.filter((t) => t.status === "failed").length,
      blocked: tasks.filter((t) => t.status === "blocked").length,
    };

    report += "## 统计\n\n";
    report += `| 状态 | 数量 |\n`;
    report += `|------|------|\n`;
    report += `| ⏳ 待处理 | ${stats.pending} |\n`;
    report += `| 🔄 进行中 | ${stats.inProgress} |\n`;
    report += `| ✅ 已完成 | ${stats.completed} |\n`;
    report += `| ❌ 失败 | ${stats.failed} |\n`;
    report += `| 🚫 阻塞 | ${stats.blocked} |\n`;
    report += `| **总计** | **${stats.total}** |\n\n`;

    // 任务列表
    report += "## 任务列表\n\n";

    for (const task of tasks) {
      const icon = this.getStatusIcon(task.status);
      const progressBar = this.generateProgressBar(task.percentage);

      report += `### ${icon} ${task.name}\n\n`;
      report += `**ID:** ${task.taskId}\n\n`;
      report += `**进度:** ${progressBar}\n\n`;
      report += `**步骤:** ${task.completedSteps}/${task.totalSteps}\n\n`;

      if (task.startTime) {
        report += `**开始时间:** ${task.startTime.toLocaleString("zh-CN")}\n\n`;
      }

      if (task.estimatedEndTime && task.status === "in_progress") {
        report += `**预计完成:** ${task.estimatedEndTime.toLocaleString("zh-CN")}\n\n`;
      }

      if (task.endTime) {
        report += `**结束时间:** ${task.endTime.toLocaleString("zh-CN")}\n\n`;
      }

      if (task.errorMessage) {
        report += `**错误:** ${task.errorMessage}\n\n`;
      }

      // 子任务
      if (task.subtasks.length > 0) {
        report += `**子任务:**\n\n`;
        for (const subtask of task.subtasks) {
          const subIcon = this.getStatusIcon(subtask.status);
          report += `- ${subIcon} ${subtask.name}: ${this.generateProgressBar(subtask.percentage, 10)}\n`;
        }
        report += "\n";
      }
    }

    return report;
  }

  /**
   * 保存进度到 Ledger
   */
  async saveToLedger(): Promise<void> {
    if (!this.config.autoSave) return;

    const report = this.generateMarkdownReport();

    try {
      // 确保目录存在
      const dir = this.config.ledgerPath.split("/").slice(0, -1).join("/");
      await $`mkdir -p ${dir}`.quiet();

      // 写入文件
      await Bun.write(this.config.ledgerPath, report);
    } catch (error) {
      console.error("保存进度到 Ledger 时出错:", error);
    }
  }

  /**
   * 调度保存
   */
  private scheduleSave(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }

    this.saveTimer = setTimeout(() => {
      this.saveToLedger();
    }, this.config.updateInterval);
  }

  /**
   * 立即保存
   */
  async flush(): Promise<void> {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    await this.saveToLedger();
  }

  /**
   * 清理资源
   */
  destroy(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
  }
}

/**
 * 创建全局进度追踪器实例
 */
export function createProgressTracker(
  config?: Partial<ProgressTrackerConfig>,
): ProgressTracker {
  return new ProgressTracker(config);
}
