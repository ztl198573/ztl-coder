/**
 * Workflow 持久化系统
 * 支持工作流状态保存、恢复和检查点
 */

import { z } from "zod";
import { log } from "./logger";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  unlinkSync,
  statSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";

// ============================================
// 类型定义
// ============================================

export const workflowStepSchema = z.object({
  id: z.string().describe("步骤 ID"),
  name: z.string().describe("步骤名称"),
  status: z.enum(["pending", "running", "completed", "failed", "skipped"]),
  startedAt: z.string().optional().describe("开始时间"),
  completedAt: z.string().optional().describe("完成时间"),
  result: z.unknown().optional().describe("步骤结果"),
  error: z.string().optional().describe("错误信息"),
  metadata: z.record(z.unknown()).optional().describe("额外元数据"),
});

export const workflowStateSchema = z.object({
  id: z.string().describe("工作流 ID"),
  name: z.string().describe("工作流名称"),
  type: z.string().describe("工作流类型"),
  status: z.enum([
    "created",
    "running",
    "paused",
    "completed",
    "failed",
    "cancelled",
  ]),
  currentStep: z.string().optional().describe("当前步骤 ID"),
  steps: z.array(workflowStepSchema).describe("步骤列表"),
  context: z.record(z.unknown()).describe("工作流上下文"),
  createdAt: z.string().describe("创建时间"),
  updatedAt: z.string().describe("更新时间"),
  completedAt: z.string().optional().describe("完成时间"),
  parentId: z.string().optional().describe("父工作流 ID"),
  tags: z.array(z.string()).optional().describe("标签"),
  checkpoint: z.string().optional().describe("检查点名称"),
});

export type WorkflowStep = z.infer<typeof workflowStepSchema>;
export type WorkflowState = z.infer<typeof workflowStateSchema>;

export type WorkflowStatus = WorkflowState["status"];
export type StepStatus = WorkflowStep["status"];

// ============================================
// 常量
// ============================================

const ZTL_DIR = join(homedir(), ".ztl-coder");
const WORKFLOWS_DIR = join(ZTL_DIR, "workflows");
const ACTIVE_DIR = join(WORKFLOWS_DIR, "active");
const COMPLETED_DIR = join(WORKFLOWS_DIR, "completed");
const CHECKPOINTS_DIR = join(WORKFLOWS_DIR, "checkpoints");

// ============================================
// 工作流管理器
// ============================================

export class WorkflowPersistence {
  private workflowsDir: string;
  private activeDir: string;
  private completedDir: string;
  private checkpointsDir: string;

  constructor(baseDir?: string) {
    const base = baseDir || ZTL_DIR;
    this.workflowsDir = join(base, "workflows");
    this.activeDir = join(this.workflowsDir, "active");
    this.completedDir = join(this.workflowsDir, "completed");
    this.checkpointsDir = join(this.workflowsDir, "checkpoints");

    this.ensureDirectories();
  }

  private ensureDirectories(): void {
    mkdirSync(this.activeDir, { recursive: true });
    mkdirSync(this.completedDir, { recursive: true });
    mkdirSync(this.checkpointsDir, { recursive: true });
  }

  // ============================================
  // 工作流生命周期
  // ============================================

  /**
   * 创建新工作流
   */
  create(params: {
    name: string;
    type: string;
    steps: Array<{ id: string; name: string }>;
    context?: Record<string, unknown>;
    parentId?: string;
    tags?: string[];
  }): WorkflowState {
    const id = this.generateId();
    const now = new Date().toISOString();

    const workflow: WorkflowState = {
      id,
      name: params.name,
      type: params.type,
      status: "created",
      steps: params.steps.map((s) => ({
        id: s.id,
        name: s.name,
        status: "pending" as const,
      })),
      context: params.context || {},
      createdAt: now,
      updatedAt: now,
      parentId: params.parentId,
      tags: params.tags,
    };

    this.save(workflow);
    log.info(`创建工作流: ${id}`, {
      operation: "workflow_create",
      data: { name: params.name, type: params.type },
    });

    return workflow;
  }

  /**
   * 获取工作流
   */
  get(id: string): WorkflowState | null {
    const filePath = this.getWorkflowPath(id);
    if (!existsSync(filePath)) {
      return null;
    }

    try {
      const content = readFileSync(filePath, "utf-8");
      return workflowStateSchema.parse(JSON.parse(content));
    } catch (error) {
      log.warn(`加载工作流失败: ${id}`, {
        operation: "workflow_load",
        data: { error },
      });
      return null;
    }
  }

  /**
   * 更新工作流
   */
  update(
    id: string,
    updates: Partial<
      Pick<
        WorkflowState,
        "status" | "currentStep" | "context" | "completedAt" | "checkpoint"
      >
    >
  ): WorkflowState | null {
    const workflow = this.get(id);
    if (!workflow) {
      return null;
    }

    const updated: WorkflowState = {
      ...workflow,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    // 如果状态变为终态，移动到 completed 目录
    if (
      this.isTerminalStatus(updates.status) &&
      !this.isTerminalStatus(workflow.status)
    ) {
      this.moveToCompleted(updated);
    } else {
      this.save(updated);
    }

    return updated;
  }

  /**
   * 启动工作流
   */
  start(id: string): WorkflowState | null {
    const workflow = this.get(id);
    if (!workflow) {
      return null;
    }

    if (workflow.status !== "created") {
      log.warn(`工作流 ${id} 无法启动，当前状态: ${workflow.status}`, {
        operation: "workflow_start",
      });
      return null;
    }

    return this.update(id, {
      status: "running",
      currentStep: workflow.steps[0]?.id,
    });
  }

  /**
   * 暂停工作流
   */
  pause(id: string): WorkflowState | null {
    return this.update(id, { status: "paused" });
  }

  /**
   * 恢复工作流
   */
  resume(id: string): WorkflowState | null {
    const workflow = this.get(id);
    if (!workflow || workflow.status !== "paused") {
      return null;
    }

    return this.update(id, { status: "running" });
  }

  /**
   * 完成工作流
   */
  complete(id: string): WorkflowState | null {
    return this.update(id, {
      status: "completed",
      completedAt: new Date().toISOString(),
    });
  }

  /**
   * 失败工作流
   */
  fail(id: string, error: string): WorkflowState | null {
    const workflow = this.get(id);
    if (!workflow) {
      return null;
    }

    // 更新当前步骤为失败
    const steps = workflow.steps.map((s) =>
      s.id === workflow.currentStep
        ? { ...s, status: "failed" as const, error }
        : s
    );

    const updated: WorkflowState = {
      ...workflow,
      status: "failed",
      steps,
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.moveToCompleted(updated);
    return updated;
  }

  /**
   * 取消工作流
   */
  cancel(id: string): WorkflowState | null {
    return this.update(id, {
      status: "cancelled",
      completedAt: new Date().toISOString(),
    });
  }

  // ============================================
  // 步骤管理
  // ============================================

  /**
   * 开始步骤
   */
  startStep(workflowId: string, stepId: string): WorkflowState | null {
    const workflow = this.get(workflowId);
    if (!workflow) {
      return null;
    }

    const steps = workflow.steps.map((s) =>
      s.id === stepId
        ? { ...s, status: "running" as const, startedAt: new Date().toISOString() }
        : s
    );

    const updated: WorkflowState = {
      ...workflow,
      currentStep: stepId,
      steps,
      updatedAt: new Date().toISOString(),
    };

    this.save(updated);
    return updated;
  }

  /**
   * 完成步骤
   */
  completeStep(
    workflowId: string,
    stepId: string,
    result?: unknown
  ): WorkflowState | null {
    const workflow = this.get(workflowId);
    if (!workflow) {
      return null;
    }

    const steps = workflow.steps.map((s) =>
      s.id === stepId
        ? {
            ...s,
            status: "completed" as const,
            completedAt: new Date().toISOString(),
            result,
          }
        : s
    );

    // 查找下一个步骤
    const currentIndex = workflow.steps.findIndex((s) => s.id === stepId);
    const nextStep = workflow.steps[currentIndex + 1];

    const updated: WorkflowState = {
      ...workflow,
      steps,
      currentStep: nextStep?.id,
      updatedAt: new Date().toISOString(),
    };

    // 如果没有下一个步骤，自动完成工作流
    if (!nextStep) {
      updated.status = "completed";
      updated.completedAt = new Date().toISOString();
      this.moveToCompleted(updated);
    } else {
      this.save(updated);
    }

    return updated;
  }

  /**
   * 跳过步骤
   */
  skipStep(workflowId: string, stepId: string, reason?: string): WorkflowState | null {
    const workflow = this.get(workflowId);
    if (!workflow) {
      return null;
    }

    const steps = workflow.steps.map((s) =>
      s.id === stepId
        ? {
            ...s,
            status: "skipped" as const,
            metadata: { skipReason: reason },
          }
        : s
    );

    const updated: WorkflowState = {
      ...workflow,
      steps,
      updatedAt: new Date().toISOString(),
    };

    this.save(updated);
    return updated;
  }

  // ============================================
  // 检查点
  // ============================================

  /**
   * 创建检查点
   */
  createCheckpoint(workflowId: string, name: string): WorkflowState | null {
    const workflow = this.get(workflowId);
    if (!workflow) {
      return null;
    }

    const checkpointPath = join(this.checkpointsDir, workflowId, `${name}.json`);
    mkdirSync(dirname(checkpointPath), { recursive: true });

    const checkpoint: WorkflowState = {
      ...workflow,
      checkpoint: name,
      updatedAt: new Date().toISOString(),
    };

    writeFileSync(checkpointPath, JSON.stringify(checkpoint, null, 2));

    log.info(`创建检查点: ${workflowId}@${name}`, {
      operation: "workflow_checkpoint",
    });

    return checkpoint;
  }

  /**
   * 恢复到检查点
   */
  restoreCheckpoint(workflowId: string, name: string): WorkflowState | null {
    const checkpointPath = join(this.checkpointsDir, workflowId, `${name}.json`);

    if (!existsSync(checkpointPath)) {
      log.warn(`检查点不存在: ${workflowId}@${name}`, {
        operation: "workflow_restore",
      });
      return null;
    }

    try {
      const content = readFileSync(checkpointPath, "utf-8");
      const checkpoint = workflowStateSchema.parse(JSON.parse(content));

      // 恢复到 active 目录
      const updated: WorkflowState = {
        ...checkpoint,
        status: "paused",
        updatedAt: new Date().toISOString(),
      };

      this.save(updated);

      log.info(`恢复检查点: ${workflowId}@${name}`, {
        operation: "workflow_restore",
      });

      return updated;
    } catch (error) {
      log.warn(`恢复检查点失败: ${workflowId}@${name}`, {
        operation: "workflow_restore",
        data: { error },
      });
      return null;
    }
  }

  /**
   * 列出检查点
   */
  listCheckpoints(workflowId: string): string[] {
    const checkpointDir = join(this.checkpointsDir, workflowId);
    if (!existsSync(checkpointDir)) {
      return [];
    }

    return readdirSync(checkpointDir)
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.slice(0, -5));
  }

  // ============================================
  // 查询
  // ============================================

  /**
   * 列出活动工作流
   */
  listActive(): WorkflowState[] {
    return this.loadWorkflowsFromDir(this.activeDir);
  }

  /**
   * 列出已完成工作流
   */
  listCompleted(limit = 50): WorkflowState[] {
    const workflows = this.loadWorkflowsFromDir(this.completedDir);
    return workflows
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, limit);
  }

  /**
   * 按类型查找
   */
  findByType(type: string): WorkflowState[] {
    const active = this.listActive();
    const completed = this.listCompleted();
    return [...active, ...completed].filter((w) => w.type === type);
  }

  /**
   * 按标签查找
   */
  findByTag(tag: string): WorkflowState[] {
    const active = this.listActive();
    const completed = this.listCompleted();
    return [...active, ...completed].filter((w) =>
      w.tags?.includes(tag)
    );
  }

  /**
   * 获取子工作流
   */
  getChildren(parentId: string): WorkflowState[] {
    const active = this.listActive();
    const completed = this.listCompleted();
    return [...active, ...completed].filter((w) => w.parentId === parentId);
  }

  // ============================================
  // 清理
  // ============================================

  /**
   * 清理旧工作流
   */
  cleanup(olderThanDays = 30): number {
    const cutoff = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
    let cleaned = 0;

    const cleanDir = (dir: string): void => {
      if (!existsSync(dir)) return;

      const files = readdirSync(dir);
      for (const file of files) {
        const filePath = join(dir, file);
        const fileStat = statSync(filePath);

        if (fileStat.isDirectory()) {
          cleanDir(filePath);
        } else if (fileStat.mtime.getTime() < cutoff) {
          unlinkSync(filePath);
          cleaned++;
        }
      }
    };

    cleanDir(this.completedDir);
    cleanDir(this.checkpointsDir);

    if (cleaned > 0) {
      log.info(`清理了 ${cleaned} 个旧工作流`, { operation: "workflow_cleanup" });
    }

    return cleaned;
  }

  // ============================================
  // 私有方法
  // ============================================

  private generateId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).slice(2, 8);
    return `wf_${timestamp}_${random}`;
  }

  private getWorkflowPath(id: string): string {
    return join(this.activeDir, `${id}.json`);
  }

  private getCompletedPath(id: string): string {
    return join(this.completedDir, `${id}.json`);
  }

  private save(workflow: WorkflowState): void {
    const filePath = this.getWorkflowPath(workflow.id);
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, JSON.stringify(workflow, null, 2));
  }

  private moveToCompleted(workflow: WorkflowState): void {
    const oldPath = this.getWorkflowPath(workflow.id);
    const newPath = this.getCompletedPath(workflow.id);

    writeFileSync(newPath, JSON.stringify(workflow, null, 2));

    if (existsSync(oldPath)) {
      unlinkSync(oldPath);
    }
  }

  private loadWorkflowsFromDir(dir: string): WorkflowState[] {
    if (!existsSync(dir)) {
      return [];
    }

    const workflows: WorkflowState[] = [];
    const files = readdirSync(dir);

    for (const file of files) {
      if (!file.endsWith(".json")) continue;

      try {
        const content = readFileSync(join(dir, file), "utf-8");
        workflows.push(workflowStateSchema.parse(JSON.parse(content)));
      } catch {
        // 跳过无效文件
      }
    }

    return workflows;
  }

  private isTerminalStatus(status?: WorkflowStatus): boolean {
    return status === "completed" || status === "failed" || status === "cancelled";
  }
}

// 单例实例
export const workflowPersistence = new WorkflowPersistence();

// ============================================
// 便捷函数
// ============================================

/**
 * 创建工作流
 */
export function createWorkflow(params: {
  name: string;
  type: string;
  steps: Array<{ id: string; name: string }>;
  context?: Record<string, unknown>;
  parentId?: string;
  tags?: string[];
}): WorkflowState {
  return workflowPersistence.create(params);
}

/**
 * 获取工作流
 */
export function getWorkflow(id: string): WorkflowState | null {
  return workflowPersistence.get(id);
}

/**
 * 更新工作流
 */
export function updateWorkflow(
  id: string,
  updates: Partial<
    Pick<
      WorkflowState,
      "status" | "currentStep" | "context" | "completedAt" | "checkpoint"
    >
  >
): WorkflowState | null {
  return workflowPersistence.update(id, updates);
}

/**
 * 获取工作流进度
 */
export function getWorkflowProgress(id: string): {
  total: number;
  completed: number;
  pending: number;
  failed: number;
  percentage: number;
} {
  const workflow = workflowPersistence.get(id);
  if (!workflow) {
    return { total: 0, completed: 0, pending: 0, failed: 0, percentage: 0 };
  }

  const total = workflow.steps.length;
  const completed = workflow.steps.filter((s) => s.status === "completed").length;
  const pending = workflow.steps.filter((s) => s.status === "pending").length;
  const failed = workflow.steps.filter((s) => s.status === "failed").length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return { total, completed, pending, failed, percentage };
}

/**
 * 格式化工作流状态
 */
export function formatWorkflowStatus(workflow: WorkflowState): string {
  const progress = getWorkflowProgress(workflow.id);
  const lines: string[] = [
    `# 工作流: ${workflow.name}`,
    "",
    `**ID**: ${workflow.id}`,
    `**类型**: ${workflow.type}`,
    `**状态**: ${workflow.status}`,
    `**进度**: ${progress.completed}/${progress.total} (${progress.percentage}%)`,
    `**创建**: ${workflow.createdAt}`,
    `**更新**: ${workflow.updatedAt}`,
    "",
    "## 步骤",
    "",
  ];

  for (const step of workflow.steps) {
    const statusIcon = {
      pending: "⏳",
      running: "🔄",
      completed: "✅",
      failed: "❌",
      skipped: "⏭️",
    }[step.status];

    lines.push(`- ${statusIcon} ${step.name} (${step.status})`);
  }

  return lines.join("\n");
}
