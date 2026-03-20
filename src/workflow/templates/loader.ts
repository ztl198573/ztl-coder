/**
 * 模板加载器
 *
 * 负责加载和管理模板
 */

import type { WorkflowTemplate, TemplateRegistry } from "./types.ts";

// 导入预置模板
import { featureTemplate } from "./presets/feature.ts";
import { bugfixTemplate } from "./presets/bugfix.ts";
import { refactorTemplate } from "./presets/refactor.ts";

/** 全局模板注册表 */
const registry: TemplateRegistry = {
  templates: new Map(),
  lastUpdated: new Date(),
};

// 注册预置模板
registry.templates.set(featureTemplate.id, featureTemplate);
registry.templates.set(bugfixTemplate.id, bugfixTemplate);
registry.templates.set(refactorTemplate.id, refactorTemplate);

/**
 * 列出所有可用模板
 */
export function listTemplates(): WorkflowTemplate[] {
  return Array.from(registry.templates.values());
}

/**
 * 获取指定模板
 */
export function getTemplate(id: string): WorkflowTemplate | null {
  return registry.templates.get(id) || null;
}

/**
 * 从文件加载模板
 */
export async function loadTemplate(
  path: string,
): Promise<WorkflowTemplate | null> {
  try {
    const file = Bun.file(path);
    const content = await file.text();

    // 解析模板（支持 JSON 或 YAML）
    if (path.endsWith(".json")) {
      const template = JSON.parse(content) as WorkflowTemplate;
      registry.templates.set(template.id, template);
      registry.lastUpdated = new Date();
      return template;
    }

    // 简单的 YAML 解析（仅支持基本格式）
    if (path.endsWith(".yaml") || path.endsWith(".yml")) {
      const template = parseSimpleYaml(content);
      if (template) {
        registry.templates.set(template.id, template);
        registry.lastUpdated = new Date();
      }
      return template;
    }

    return null;
  } catch (error) {
    console.error(`加载模板失败: ${path}`, error);
    return null;
  }
}

/**
 * 简单 YAML 解析器
 */
function parseSimpleYaml(content: string): WorkflowTemplate | null {
  const lines = content.split("\n");
  const data: Record<string, unknown> = {};
  let currentKey = "";

  for (const line of lines) {
    if (!line.trim() || line.trim().startsWith("#")) continue;

    const colonIndex = line.indexOf(":");
    if (colonIndex > 0) {
      currentKey = line.slice(0, colonIndex).trim();
      const value = line.slice(colonIndex + 1).trim();
      if (value) {
        data[currentKey] = value;
      }
    }
  }

  // 确保必要的字段存在
  if (!data.id || !data.name) {
    return null;
  }

  return data as unknown as WorkflowTemplate;
}

/**
 * 注册自定义模板
 */
export function registerTemplate(template: WorkflowTemplate): void {
  registry.templates.set(template.id, template);
  registry.lastUpdated = new Date();
}

/**
 * 导出注册表
 */
export { registry };
