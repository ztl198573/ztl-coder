/**
 * 进度通知模块
 *
 * 提供任务进度实时通知和状态变更提醒
 */

import { output, formatDuration, formatPercent } from "./output.ts";

/** 任务状态 */
export type TaskStatus = "pending" | "running" | "completed" | "failed" | "cancelled";

/** 通知类型 */
export type NotificationType = "info" | "success" | "warning" | "error" | "progress";

/** 进度信息 */
export interface ProgressInfo {
  /** 任务 ID */
  taskId: string;
  /** 任务名称 */
  taskName: string;
  /** 当前状态 */
  status: TaskStatus;
  /** 进度（0-1） */
  progress: number;
  /** 当前步骤 */
  currentStep?: number;
  /** 总步骤 */
  totalSteps?: number;
  /** 开始时间 */
  startTime?: Date;
  /** 预计剩余时间（毫秒） */
  estimatedRemaining?: number;
  /** 消息 */
  message?: string;
  /** 附加数据 */
  data?: Record<string, unknown>;
}

/** 通知配置 */
export interface NotificationConfig {
  /** 是否启用声音 */
  sound: boolean;
  /** 是否启用桌面通知 */
  desktop: boolean;
  /** 是否启用控制台输出 */
  console: boolean;
  /** 最小通知间隔（毫秒） */
  minInterval: number;
  /** 进度更新间隔（毫秒） */
  progressInterval: number;
}

/** 默认配置 */
const DEFAULT_CONFIG: NotificationConfig = {
  sound: false,
  desktop: false,
  console: true,
  minInterval: 1000,
  progressInterval: 500,
};

/** 进度通知器 */
export class ProgressNotifier {
  private config: NotificationConfig;
  private activeTasks: Map<string, ProgressInfo> = new Map();
  private lastNotification: Map<string, number> = new Map();
  private spinnerFrame: number = 0;
  private spinnerInterval: Timer | null = null;

  constructor(config: Partial<NotificationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /** 开始任务 */
  startTask(taskId: string, taskName: string, totalSteps?: number): void {
    const info: ProgressInfo = {
      taskId,
      taskName,
      status: "running",
      progress: 0,
      currentStep: 0,
      totalSteps,
      startTime: new Date(),
    };

    this.activeTasks.set(taskId, info);
    this.notify(info, `开始: ${taskName}`);
  }

  /** 更新进度 */
  updateProgress(taskId: string, progress: number, message?: string): void {
    const info = this.activeTasks.get(taskId);
    if (!info) return;

    info.progress = Math.min(1, Math.max(0, progress));
    if (message) info.message = message;

    // 计算预计剩余时间
    if (info.startTime && info.progress > 0) {
      const elapsed = Date.now() - info.startTime.getTime();
      const totalEstimated = elapsed / info.progress;
      info.estimatedRemaining = totalEstimated - elapsed;
    }

    // 检查是否应该发送通知
    const now = Date.now();
    const last = this.lastNotification.get(taskId) || 0;
    if (now - last >= this.config.progressInterval) {
      this.notifyProgress(info);
      this.lastNotification.set(taskId, now);
    }
  }

  /** 更新步骤 */
  updateStep(taskId: string, currentStep: number, message?: string): void {
    const info = this.activeTasks.get(taskId);
    if (!info) return;

    info.currentStep = currentStep;
    if (info.totalSteps) {
      info.progress = currentStep / info.totalSteps;
    }
    if (message) info.message = message;

    const now = Date.now();
    const last = this.lastNotification.get(taskId) || 0;
    if (now - last >= this.config.progressInterval) {
      this.notifyProgress(info);
      this.lastNotification.set(taskId, now);
    }
  }

  /** 完成任务 */
  completeTask(taskId: string, message?: string): void {
    const info = this.activeTasks.get(taskId);
    if (!info) return;

    info.status = "completed";
    info.progress = 1;
    info.message = message;

    this.notify(info, output.success(`完成: ${info.taskName}`), "success");
    this.activeTasks.delete(taskId);
    this.lastNotification.delete(taskId);
  }

  /** 任务失败 */
  failTask(taskId: string, error: string): void {
    const info = this.activeTasks.get(taskId);
    if (!info) return;

    info.status = "failed";
    info.message = error;

    this.notify(info, output.error(`失败: ${info.taskName} - ${error}`), "error");
    this.activeTasks.delete(taskId);
    this.lastNotification.delete(taskId);
  }

  /** 取消任务 */
  cancelTask(taskId: string): void {
    const info = this.activeTasks.get(taskId);
    if (!info) return;

    info.status = "cancelled";

    this.notify(info, output.warning(`取消: ${info.taskName}`), "warning");
    this.activeTasks.delete(taskId);
    this.lastNotification.delete(taskId);
  }

  /** 获取活动任务 */
  getActiveTasks(): ProgressInfo[] {
    return Array.from(this.activeTasks.values());
  }

  /** 获取进度条字符串 */
  getProgressBar(info: ProgressInfo, width: number = 30): string {
    return output.progressBar(info.progress * 100, 100, width);
  }

  /** 获取状态行 */
  getStatusLine(info: ProgressInfo): string {
    const spinner = output.spinner(this.spinnerFrame);
    const progress = this.getProgressBar(info, 20);
    const percent = formatPercent(info.progress);

    let status = "";
    switch (info.status) {
      case "running":
        status = output.color("运行中", "yellow");
        break;
      case "completed":
        status = output.success("已完成");
        break;
      case "failed":
        status = output.error("失败");
        break;
      case "cancelled":
        status = output.warning("已取消");
        break;
      default:
        status = output.dim("等待中");
    }

    let line = `${spinner} ${info.taskName} ${progress} ${percent} ${status}`;

    if (info.currentStep !== undefined && info.totalSteps !== undefined) {
      line += output.dim(` (${info.currentStep}/${info.totalSteps})`);
    }

    if (info.estimatedRemaining !== undefined && info.estimatedRemaining > 0) {
      line += output.dim(` 预计剩余: ${formatDuration(info.estimatedRemaining)}`);
    }

    return line;
  }

  /** 开始旋转动画 */
  startSpinner(): void {
    if (this.spinnerInterval) return;

    this.spinnerInterval = setInterval(() => {
      this.spinnerFrame = (this.spinnerFrame + 1) % 10;
    }, 80);
  }

  /** 停止旋转动画 */
  stopSpinner(): void {
    if (this.spinnerInterval) {
      clearInterval(this.spinnerInterval);
      this.spinnerInterval = null;
    }
  }

  private notify(info: ProgressInfo, message: string, type: NotificationType = "info"): void {
    if (!this.config.console) return;

    // 检查最小间隔
    const now = Date.now();
    const last = this.lastNotification.get(info.taskId) || 0;
    if (type !== "success" && type !== "error" && now - last < this.config.minInterval) {
      return;
    }

    console.log(message);

    if (this.config.desktop) {
      this.sendDesktopNotification(info.taskName, message, type);
    }

    if (this.config.sound && (type === "success" || type === "error")) {
      this.playSound(type);
    }
  }

  private notifyProgress(info: ProgressInfo): void {
    if (!this.config.console) return;
    console.log(this.getStatusLine(info));
  }

  private sendDesktopNotification(title: string, body: string, type: NotificationType): void {
    // 桌面通知需要系统支持
    try {
      const urgency = type === "error" ? "critical" : "normal";
      Bun.spawn(["notify-send", "-u", urgency, title, body]);
    } catch {
      // 忽略通知失败
    }
  }

  private playSound(type: NotificationType): void {
    // 声音播放需要系统支持
    try {
      const sound = type === "success" ? "bell" : "basso";
      Bun.spawn(["paplay", `/usr/share/sounds/freedesktop/stereo/${sound}.oga`]);
    } catch {
      // 忽略播放失败
    }
  }
}

/** 全局进度通知器 */
let globalNotifier: ProgressNotifier | null = null;

/** 获取全局通知器 */
export function getNotifier(): ProgressNotifier {
  if (!globalNotifier) {
    globalNotifier = new ProgressNotifier();
  }
  return globalNotifier;
}

/** 创建通知器 */
export function createNotifier(config: Partial<NotificationConfig> = {}): ProgressNotifier {
  return new ProgressNotifier(config);
}

/** 便捷方法：显示进度 */
export function showProgress(taskId: string, progress: number, message?: string): void {
  getNotifier().updateProgress(taskId, progress, message);
}

/** 便捷方法：显示状态变更 */
export function showStatus(taskId: string, status: TaskStatus, message?: string): void {
  const notifier = getNotifier();
  switch (status) {
    case "completed":
      notifier.completeTask(taskId, message);
      break;
    case "failed":
      notifier.failTask(taskId, message || "未知错误");
      break;
    case "cancelled":
      notifier.cancelTask(taskId);
      break;
    default:
      notifier.updateProgress(taskId, 0, message);
  }
}

/** 进度回调类型 */
export type ProgressCallback = (info: ProgressInfo) => void;

/** 创建进度跟踪包装器 */
export function withProgress<T>(
  taskId: string,
  taskName: string,
  fn: (update: (progress: number, message?: string) => void) => Promise<T>,
  config?: Partial<NotificationConfig>,
): Promise<T> {
  const notifier = new ProgressNotifier(config);

  return new Promise((resolve, reject) => {
    notifier.startTask(taskId, taskName);

    const update = (progress: number, message?: string) => {
      notifier.updateProgress(taskId, progress, message);
    };

    fn(update)
      .then((result) => {
        notifier.completeTask(taskId);
        resolve(result);
      })
      .catch((error) => {
        notifier.failTask(taskId, error instanceof Error ? error.message : String(error));
        reject(error);
      })
      .finally(() => {
        notifier.stopSpinner();
      });
  });
}
