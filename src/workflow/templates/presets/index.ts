/**
 * 预置模板导出
 */

export { featureTemplate } from "./feature.ts";
export { bugfixTemplate } from "./bugfix.ts";
export { refactorTemplate } from "./refactor.ts";

import { featureTemplate } from "./feature.ts";
import { bugfixTemplate } from "./bugfix.ts";
import { refactorTemplate } from "./refactor.ts";
import type { WorkflowTemplate } from "../types.ts";

/** 所有预置模板 */
export const presetTemplates: WorkflowTemplate[] = [
  featureTemplate,
  bugfixTemplate,
  refactorTemplate,
];

/** 按类型获取模板 */
export function getTemplatesByType(
  type: WorkflowTemplate["type"],
): WorkflowTemplate[] {
  return presetTemplates.filter((t) => t.type === type);
}

/** 获取模板摘要 */
export function getTemplateSummary(): Array<{
  id: string;
  name: string;
  type: string;
  estimatedTime: number | undefined;
}> {
  return presetTemplates.map((t) => ({
    id: t.id,
    name: t.name,
    type: t.type,
    estimatedTime: t.estimatedTime,
  }));
}
