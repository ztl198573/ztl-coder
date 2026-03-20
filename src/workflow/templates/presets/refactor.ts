/**
 * 重构模板
 *
 * 适用于代码重构的标准工作流
 */

import type { WorkflowTemplate } from "../types.ts";

export const refactorTemplate: WorkflowTemplate = {
  id: "refactor",
  name: "代码重构",
  description: "代码重构工作流：分析 → 计划 → 重构 → 验证",
  type: "refactor",
  version: "1.0.0",
  author: "ztl-coder",
  tags: ["refactor", "clean-code", "optimization"],
  prerequisites: [
    "已识别需要重构的代码",
    "有足够的测试覆盖",
  ],
  steps: [
    {
      id: "analyze",
      name: "代码分析",
      description: "分析当前代码结构和问题点",
      agent: "ztl-coder:codebase-analyzer",
      outputs: ["代码结构分析", "问题点列表", "重构建议"],
      timeout: 600,
    },
    {
      id: "plan",
      name: "重构计划",
      description: "制定详细的重构计划",
      agent: "ztl-coder:planner",
      dependsOn: ["analyze"],
      outputs: ["重构步骤", "风险评估", "回滚计划"],
      timeout: 300,
    },
    {
      id: "prepare-tests",
      name: "准备测试",
      description: "确保有足够的测试覆盖",
      agent: "ztl-coder:implementer",
      dependsOn: ["plan"],
      inputs: {
        scope: "test",
        mode: "coverage",
      },
      outputs: ["测试基准"],
      timeout: 300,
    },
    {
      id: "refactor-core",
      name: "核心重构",
      description: "执行核心重构操作",
      agent: "ztl-coder:implementer",
      dependsOn: ["prepare-tests"],
      inputs: {
        mode: "refactor",
      },
      outputs: ["重构代码"],
      timeout: 1800,
    },
    {
      id: "verify",
      name: "验证重构",
      description: "运行测试验证重构正确性",
      agent: "ztl-coder:reviewer",
      dependsOn: ["refactor-core"],
      outputs: ["验证报告"],
      timeout: 300,
    },
    {
      id: "optimize",
      name: "性能优化",
      description: "优化重构后的代码性能",
      agent: "ztl-coder:implementer",
      dependsOn: ["verify"],
      parallel: true,
      inputs: {
        mode: "optimize",
      },
      outputs: ["优化代码"],
      timeout: 600,
    },
    {
      id: "document",
      name: "更新文档",
      description: "更新相关文档",
      agent: "ztl-coder:implementer",
      dependsOn: ["optimize"],
      inputs: {
        scope: "docs",
      },
      outputs: ["文档更新"],
      timeout: 300,
    },
  ],
  postActions: [
    "运行完整测试套件",
    "检查性能指标",
    "更新 CHANGELOG",
  ],
  estimatedTime: 90,
};
