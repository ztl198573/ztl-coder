/**
 * 新功能开发模板
 *
 * 适用于开发新功能的标准工作流
 */

import type { WorkflowTemplate } from "../types.ts";

export const featureTemplate: WorkflowTemplate = {
  id: "feature-development",
  name: "新功能开发",
  description: "完整的新功能开发工作流：需求分析 → 设计 → 实现 → 测试 → 文档",
  type: "feature",
  version: "1.0.0",
  author: "ztl-coder",
  tags: ["feature", "development", "full-cycle"],
  prerequisites: [
    "已明确功能需求",
    "已创建功能分支",
    "项目结构已初始化",
  ],
  steps: [
    {
      id: "analyze",
      name: "需求分析",
      description: "分析功能需求，识别关键组件和接口",
      agent: "ztl-coder:brainstormer",
      outputs: ["需求文档", "技术方案"],
      timeout: 600,
    },
    {
      id: "design",
      name: "架构设计",
      description: "设计功能架构和数据流",
      agent: "ztl-coder:octto",
      dependsOn: ["analyze"],
      outputs: ["架构设计文档", "接口定义"],
      timeout: 900,
    },
    {
      id: "plan",
      name: "实现计划",
      description: "创建详细的实现计划",
      agent: "ztl-coder:planner",
      dependsOn: ["design"],
      outputs: ["实现计划", "任务列表"],
      timeout: 300,
    },
    {
      id: "implement-core",
      name: "核心实现",
      description: "实现核心功能逻辑",
      agent: "ztl-coder:implementer",
      dependsOn: ["plan"],
      inputs: {
        scope: "core",
      },
      outputs: ["核心代码"],
      timeout: 1800,
    },
    {
      id: "implement-ui",
      name: "UI 实现",
      description: "实现用户界面组件",
      agent: "ztl-coder:implementer",
      dependsOn: ["plan"],
      parallel: true,
      inputs: {
        scope: "ui",
      },
      outputs: ["UI 组件"],
      timeout: 1800,
    },
    {
      id: "test",
      name: "测试编写",
      description: "编写单元测试和集成测试",
      agent: "ztl-coder:implementer",
      dependsOn: ["implement-core", "implement-ui"],
      inputs: {
        scope: "test",
      },
      outputs: ["测试文件"],
      timeout: 900,
    },
    {
      id: "review",
      name: "代码审查",
      description: "审查代码质量和安全性",
      agent: "ztl-coder:reviewer",
      dependsOn: ["test"],
      outputs: ["审查报告"],
      timeout: 600,
    },
    {
      id: "document",
      name: "文档更新",
      description: "更新 API 文档和 README",
      agent: "ztl-coder:implementer",
      dependsOn: ["review"],
      parallel: true,
      inputs: {
        scope: "docs",
      },
      outputs: ["文档更新"],
      timeout: 300,
    },
  ],
  postActions: [
    "运行完整测试套件",
    "检查代码覆盖率",
    "更新 CHANGELOG",
  ],
  estimatedTime: 120,
};
