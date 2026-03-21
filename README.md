# ztl-coder

**企业级 Claude Code 插件** - 完整的软件开发生命周期自动化

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/ztl/ztl-coder)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

## 概述

ztl-coder 是一个功能完整的 Claude Code 插件，采用 **Agent → Subagent → MCP Tool** 三层架构，提供从需求分析到产品交付的完整工作流自动化。

### 核心特性

- 🧠 **智能头脑风暴** - 将模糊需求转化为清晰的产品设计
- 📋 **结构化计划** - 自动生成批次化的实现计划
- ✅ **TDD 工作流** - Red → Green → Refactor 循环，确保代码质量
- 🐛 **智能调试** - 可观测性增强 + 根因分析
- 👔 **企业级审查** - CEO、设计、QA 多视角审查
- 🔧 **MCP 工具集** - AST 搜索、PTY 管理、浏览器自动化

## 架构

```
┌─────────────────────────────────────────────────────────────┐
│                    Primary Agents                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  Commander  │  │Brainstormer │  │    Octto    │         │
│  │  (编排器)   │  │ (设计探索)  │  │ (可视化)    │         │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         │
└─────────┼────────────────┼────────────────┼─────────────────┘
          │                │                │
          ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────┐
│                      Subagents (17)                         │
│  planner │ executor │ implementer │ test-writer │ debugger │
│  reviewer │ e2e-tester │ doc-manager │ ceo-reviewer │ ...   │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│                      MCP Tools (9)                          │
│  look_at │ artifact_search │ ast_grep_* │ pty_* │ browse   │
└─────────────────────────────────────────────────────────────┘
```

## 安装

### 前置要求

- Node.js 18+
- Claude Code CLI
- Plannotator CLI（可选，用于可视化计划审查）

```bash
# macOS / Linux / WSL
curl -fsSL https://plannotator.ai/install.sh | bash

# Windows PowerShell
irm https://plannotator.ai/install.ps1 | iex
```

### 从 Marketplace 安装

```bash
# 添加 Gitee marketplace
claude plugins marketplace add https://gitee.com/ass2in/ztl-coder.git

# 安装插件
claude plugins install ztl-coder

# 重启 Claude Code
```

### 本地安装

```bash
# 克隆仓库
git clone https://gitee.com/ass2in/ztl-coder.git
cd ztl-coder

# 构建项目
bun install
bun run build

# 添加本地 marketplace
claude plugins marketplace add /path/to/ztl-coder

# 安装插件
claude plugins install ztl-coder@ztl-coder-local
```

## 快速开始

### 1. 启动完整工作流

```bash
/ztl-coder-commander 帮我开发一个用户认证系统
```

### 2. 只进行头脑风暴

```bash
/ztl-coder-brainstormer 我需要一个电商购物车功能
```

### 3. 可视化交互式设计

```bash
/ztl-coder-octto 设计一个数据看板
```

## 工作流

```
BRAINSTORM → PLAN → IMPLEMENT → TEST → DEBUG* → REVIEW → VERIFY
    │           │           │         │        │        │       │
    ▼           ▼           ▼         ▼        ▼        ▼       ▼
 designs/    plans/     worktree  coverage  logs    approved  e2e
 YYYY-MM-DD YYYY-MM-DD  isolated  >=80%    +root             passed

* DEBUG 阶段仅在测试失败时触发
```

### 阶段说明

| 阶段 | 子代理 | 输出 |
|------|--------|------|
| 头脑风暴 | brainstormer/octto | 设计文档 `thoughts/shared/designs/` |
| 计划 | planner | 实现计划 `thoughts/shared/plans/` |
| 实现 | executor + implementer | 代码 + 测试（TDD） |
| 测试 | test-writer | 测试用例 + 覆盖率报告 |
| 调试 | debugger | 可观测性增强 + 根因分析 |
| 审查 | reviewer + ceo-reviewer + design-reviewer | 审查报告 |
| 验证 | e2e-tester | E2E 测试结果 |

## 主代理

| 代理 | 描述 | 使用场景 |
|------|------|----------|
| **commander** | 主编排器，协调完整工作流 | 复杂功能开发、端到端任务 |
| **brainstormer** | 设计探索和需求细化 | 需求分析、技术选型 |
| **octto** | 基于浏览器的交互式设计 | 需要可视化反馈的设计 |

## 子代理

### 开发类
| 代理 | 描述 |
|------|------|
| `planner` | 创建批次化实现计划 |
| `executor` | 编排实现→测试→审查循环 |
| `implementer` | TDD 方式执行具体任务 |

### 测试类
| 代理 | 描述 |
|------|------|
| `test-writer` | 编写单元/集成测试（Vitest/Jest/Bun/Pytest） |
| `e2e-tester` | E2E 前端自动化测试（Playwright） |
| `debugger` | 调试和根因分析 |

### 审查类
| 代理 | 描述 |
|------|------|
| `reviewer` | 多视角代码审查（工程师/架构师/安全专家） |
| `ceo-reviewer` | CEO 级别产品审查（商业价值） |
| `design-reviewer` | 设计师视角审查（UI/UX） |
| `qa-reporter` | QA 报告生成 |

### 支持类
| 代理 | 描述 |
|------|------|
| `doc-manager` | 文档管理（同步、归档、清理） |
| `investigator` | 系统化问题调查 |
| `codebase-locator` | 查找文件位置 |
| `codebase-analyzer` | 深度模块分析 |
| `pattern-finder` | 查找现有代码模式 |
| `project-initializer` | 初始化项目文档 |
| `ledger-creator` | 创建会话连续性账本 |
| `artifact-searcher` | 搜索历史工件 |

## 命令

| 命令 | 描述 |
|------|------|
| `/ztl-coder-commander` | 启动主编排器 |
| `/ztl-coder-brainstormer` | 启动设计探索会话 |
| `/ztl-coder-octto` | 启动可视化交互式设计 |
| `/ztl-coder-init` | 初始化项目文档 |
| `/ztl-coder-ledger` | 创建/更新连续性账本 |
| `/ztl-coder-search` | 搜索历史工件 |
| `/ztl-coder-doc` | 管理项目文档 |
| `/ztl-coder-review` | 交互式代码审查 |

## MCP 工具

### 代码分析
| 工具 | 描述 |
|------|------|
| `ztl_code_look_at` | 查看文件结构，节省上下文 |
| `ztl_code_ast_grep_search` | 基于 AST 的结构化代码搜索 |
| `ztl_code_ast_grep_replace` | 基于 AST 的批量代码替换 |

### 工件管理
| 工具 | 描述 |
|------|------|
| `ztl_code_artifact_search` | 搜索历史账本、计划、设计 |

### 进程管理
| 工具 | 描述 |
|------|------|
| `ztl_code_pty_spawn` | 启动后台进程会话 |
| `ztl_code_pty_write` | 向 PTY 会话发送输入 |
| `ztl_code_pty_read` | 读取 PTY 会话输出 |
| `ztl_code_pty_list` | 列出所有活动会话 |
| `ztl_code_pty_kill` | 终止 PTY 会话 |

## TDD 工作流

ztl-coder 强制执行测试驱动开发：

```
1. Red 阶段
   └── test-writer 编写失败的测试
   └── 运行测试，确认失败（正确原因）

2. Green 阶段
   └── implementer 编写最小代码使测试通过
   └── 运行测试，确认通过

3. Refactor 阶段
   └── implementer 优化代码
   └── 每次改动后验证测试通过
```

### 覆盖率要求

| 代码类型 | 最低覆盖率 |
|----------|------------|
| 核心业务逻辑 | 100% |
| 工具函数 | 90% |
| 组件 | 80% |

## 调试能力

当测试失败时，debugger 子代理自动介入：

### 核心原则
- **无调查不修复** - 先收集证据再修改代码
- **证据驱动** - 每个结论有日志/数据支撑
- **最小侵入** - 日志添加最小化代码改动

### 调试流程
1. 收集错误信息和上下文
2. 分析调用链
3. 注入调试日志（入口/出口/数据变化）
4. 运行并分析日志
5. 定位根因（5 Whys / 鱼骨图）
6. 修复并验证

## 配置

在项目根目录创建 `ztl_coder.json`：

```json
{
  "agents": {
    "commander": { "temperature": 0.2 },
    "brainstormer": { "temperature": 0.8 }
  },
  "features": {
    "tddEnforcement": true,
    "coverageGates": true,
    "debugOnFailure": true
  },
  "coverage": {
    "core": { "lines": 100, "functions": 100 },
    "utils": { "lines": 90, "functions": 90 },
    "components": { "lines": 80, "functions": 80 }
  }
}
```

## 目录结构

```
your-project/
├── thoughts/
│   ├── ledgers/           # 会话连续性账本
│   ├── shared/
│   │   ├── designs/       # 设计文档
│   │   └── plans/         # 实现计划
│   ├── debug-reports/     # 调试报告
│   └── test-reports/      # 测试报告
├── ARCHITECTURE.md        # 架构文档
└── CODE_STYLE.md          # 代码风格
```

## 文档

- [用户手册](./docs/USER_MANUAL.md) - 详细使用指南
- [常见问题](./docs/FAQ.md) - 常见问题解答
- [API 参考](./docs/API_REFERENCE.md) - MCP 工具 API

## 示例

### 完整功能开发

```bash
# 1. 启动工作流
/ztl-coder-commander 开发一个用户积分系统，支持积分获取、消费和查询

# 插件自动执行：
# - BRAINSTORM: 生成积分系统设计文档
# - PLAN: 创建 5 个批次的实现计划
# - IMPLEMENT: TDD 方式实现各模块
# - TEST: 生成测试，覆盖率 95%+
# - REVIEW: 代码审查 + CEO 审查
# - VERIFY: E2E 测试通过
```

### Bug 调试

```bash
# 报告错误
/ztl-coder-commander 用户登录时报错 "Token expired"

# debugger 自动：
# - 分析调用链
# - 注入调试日志
# - 定位根因：token 刷新逻辑错误
# - 生成修复方案
```

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

## 联系方式

- Gitee: https://gitee.com/ass2in/ztl-coder
- GitHub: https://github.com/ztl/ztl-coder
