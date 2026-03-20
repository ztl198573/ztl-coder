/**
 * 工作流模板系统
 *
 * 提供预定义的工作流模板，支持快速启动常见开发任务
 */

export type { WorkflowTemplate, TemplateStep, TemplateContext } from "./types.ts";
export { loadTemplate, listTemplates, getTemplate } from "./loader.ts";
export { applyTemplate, validateTemplate } from "./executor.ts";

// 预置模板
export { featureTemplate } from "./presets/feature.ts";
export { bugfixTemplate } from "./presets/bugfix.ts";
export { refactorTemplate } from "./presets/refactor.ts";
