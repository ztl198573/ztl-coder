/**
 * 工作流模板类型定义
 */

/** 模板步骤 */
export interface TemplateStep {
  /** 步骤 ID */
  id: string;
  /** 步骤名称 */
  name: string;
  /** 步骤描述 */
  description: string;
  /** 负责的代理 */
  agent: string;
  /** 输入参数 */
  inputs?: Record<string, string>;
  /** 预期输出 */
  outputs?: string[];
  /** 是否可并行 */
  parallel?: boolean;
  /** 依赖的步骤 ID */
  dependsOn?: string[];
  /** 超时时间（秒） */
  timeout?: number;
}

/** 模板上下文 */
export interface TemplateContext {
  /** 项目名称 */
  projectName: string;
  /** 任务描述 */
  taskDescription: string;
  /** 技术栈 */
  techStack?: string[];
  /** 约束条件 */
  constraints?: string[];
  /** 用户自定义变量 */
  variables?: Record<string, string>;
}

/** 工作流模板 */
export interface WorkflowTemplate {
  /** 模板 ID */
  id: string;
  /** 模板名称 */
  name: string;
  /** 模板描述 */
  description: string;
  /** 模板类型 */
  type: "feature" | "bugfix" | "refactor" | "custom";
  /** 模板版本 */
  version: string;
  /** 作者 */
  author?: string;
  /** 标签 */
  tags?: string[];
  /** 前置条件 */
  prerequisites?: string[];
  /** 执行步骤 */
  steps: TemplateStep[];
  /** 后置操作 */
  postActions?: string[];
  /** 估计时间（分钟） */
  estimatedTime?: number;
}

/** 模板注册表 */
export interface TemplateRegistry {
  /** 模板列表 */
  templates: Map<string, WorkflowTemplate>;
  /** 最后更新时间 */
  lastUpdated: Date;
}
