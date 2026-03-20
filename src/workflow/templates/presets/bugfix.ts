/**
 * Bug 修复模板
 *
 * 适用于修复 Bug 的标准工作流
 */

import type { WorkflowTemplate } from "../types.ts";

export const bugfixTemplate: WorkflowTemplate = {
  id: "bug-fix",
  name: "Bug 修复",
  description: "Bug 修复工作流：复现 → 定位 → 修复 → 验证",
  type: "bugfix",
  version: "1.0.0",
  author: "ztl-coder",
  tags: ["bug", "fix", "debug", "hotfix"],
  prerequisites: [
    "已确认 Bug 存在",
    "有 Bug 报告或描述",
  ],
  steps: [
    {
      id: "reproduce",
      name: "复现问题",
      description: "分析 Bug 报告并尝试复现问题",
      agent: "ztl-coder:codebase-analyzer",
      outputs: ["复现步骤", "问题现象"],
      timeout: 300,
    },
    {
      id: "locate",
      name: "定位根因",
      description: "使用代码分析定位问题根源",
      agent: "ztl-coder:codebase-locator",
      dependsOn: ["reproduce"],
      outputs: ["问题文件", "相关代码"],
      timeout: 300,
    },
    {
      id: "analyze",
      name: "分析原因",
      description: "深入分析 Bug 产生的原因",
      agent: "ztl-coder:reviewer",
      dependsOn: ["locate"],
      outputs: ["原因分析", "影响范围"],
      timeout: 300,
    },
    {
      id: "fix",
      name: "修复 Bug",
      description: "实现修复方案",
      agent: "ztl-coder:implementer",
      dependsOn: ["analyze"],
      inputs: {
        mode: "fix",
      },
      outputs: ["修复代码"],
      timeout: 600,
    },
    {
      id: "test",
      name: "验证修复",
      description: "编写测试验证修复",
      agent: "ztl-coder:implementer",
      dependsOn: ["fix"],
      inputs: {
        scope: "test",
        mode: "regression",
      },
      outputs: ["回归测试"],
      timeout: 300,
    },
    {
      id: "review",
      name: "审查修复",
      description: "审查修复代码，确保没有引入新问题",
      agent: "ztl-coder:reviewer",
      dependsOn: ["test"],
      outputs: ["审查报告"],
      timeout: 300,
    },
  ],
  postActions: [
    "验证 Bug 已修复",
    "检查是否有类似 Bug",
    "更新 CHANGELOG",
  ],
  estimatedTime: 45,
};
