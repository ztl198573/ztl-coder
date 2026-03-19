# ztl_coder 架构

## 概述

ztl_coder 是一个 Claude Code 插件，提供结构化的 **Brainstorm → Plan → Implement → Review** 工作流，集成 **Plannotator** 可视化计划审查功能。通过三层架构（Agent → Subagent → MCP Tool）实现复杂任务的可靠交付。

## 技术栈

- 语言: TypeScript, Markdown
- 平台: Claude Code Plugin System v3.1.0
- 运行时: Bun / Node.js
- MCP: @modelcontextprotocol/sdk
- 外部集成: Plannotator (可视化审查)

## 架构层次

```
┌─────────────────────────────────────────────────────────────┐
│                    Primary Agents (3)                        │
│  ztl-coder-commander | ztl-coder-brainstormer | ztl-coder-octto │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Subagents (10)                             │
│  planner | executor | implementer | reviewer | codebase-*    │
│  pattern-finder | project-initializer | ledger-creator       │
│  artifact-searcher                                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    MCP Tools (6)                             │
│  ztl_code_look_at | ztl_code_artifact_search                 │
│  ztl_code_ast_grep_search | ztl_code_ast_grep_replace        │
│  ztl_code_pty_* (spawn/write/read/list/kill)                 │
└─────────────────────────────────────────────────────────────┘
```

## 目录结构

```
ztl_coder/
├── .claude-plugin/
│   └── marketplace.json              # Marketplace 配置
├── plugins/ztl-coder/
│   ├── .claude-plugin/
│   │   └── plugin.json               # 插件定义 v3.1.0
│   ├── agents/
│   │   ├── primary/                  # 主代理 (用户可调用)
│   │   │   ├── ztl-coder-commander.md
│   │   │   ├── ztl-coder-brainstormer.md
│   │   │   └── ztl-coder-octto.md
│   │   └── subagent/                 # 子代理 (代理协调)
│   │       ├── planner.md
│   │       ├── executor.md
│   │       ├── implementer.md
│   │       ├── reviewer.md
│   │       ├── codebase-locator.md
│   │       ├── codebase-analyzer.md
│   │       ├── pattern-finder.md
│   │       ├── project-initializer.md
│   │       ├── ledger-creator.md
│   │       └── artifact-searcher.md
│   ├── commands/                     # 斜杠命令
│   │   ├── ztl-coder-init.md
│   │   ├── ztl-coder-ledger.md
│   │   ├── ztl-coder-search.md
│   │   ├── ztl-coder-review.md       # Plannotator
│   │   ├── ztl-coder-annotate.md     # Plannotator
│   │   └── ztl-coder-last.md         # Plannotator
│   ├── hooks/
│   │   └── hooks.json                # 会话钩子配置
│   └── scripts/
│       ├── think-mode-trigger.sh     # PreToolUse hook
│       ├── artifact-indexer.sh       # PostToolUse hook
│       └── install-plannotator.sh    # Plannotator 安装
├── mcp-server/                       # MCP 服务器
│   ├── src/
│   │   ├── index.ts                  # 入口
│   │   └── tools/
│   │       ├── ast-grep-search.ts
│   │       ├── ast-grep-replace.ts
│   │       ├── look-at.ts
│   │       ├── artifact-search.ts
│   │       └── pty-manager.ts
│   └── dist/
│       └── index.js                  # 编译产物
├── src/                              # 共享工具
│   └── utils/
│       ├── config.ts
│       ├── logger.ts
│       └── errors.ts
├── thoughts/                         # 运行时工件存储
│   ├── ledgers/                      # 会话连续性账本
│   └── shared/
│       ├── designs/                  # 设计文档
│       └── plans/                    # 实现计划
├── .mcp.json                         # MCP 服务器配置
├── CLAUDE.md                         # 项目规则
├── package.json                      # NPM 配置
└── README.md                         # 项目文档
```

## 核心组件

### Primary Agents (3个)

| Agent | 职责 | 使用场景 |
|-------|------|----------|
| `ztl-coder-commander` | 主编排器，协调复杂任务 | 复杂功能开发，多步骤任务 |
| `ztl-coder-brainstormer` | 设计探索，细化需求 | 需求不明确，需要探索方案 |
| `ztl-coder-octto` | 交互式头脑风暴 + 可视化反馈 | 协作设计，计划审查 |

### Subagents (10个)

| Subagent | 职责 |
|----------|------|
| `planner` | 创建实现计划 |
| `executor` | 编排 implement→review 循环 |
| `implementer` | 执行单个任务 |
| `reviewer` | 代码审查 |
| `codebase-locator` | 查找文件位置 |
| `codebase-analyzer` | 深度模块分析 |
| `pattern-finder` | 查找现有模式 |
| `project-initializer` | 初始化项目文档 |
| `ledger-creator` | 创建会话账本 |
| `artifact-searcher` | 搜索历史工件 |

### Commands (6个)

| Command | 用途 |
|---------|------|
| `/ztl-coder-init` | 生成 ARCHITECTURE.md 和 CODE_STYLE.md |
| `/ztl-coder-ledger` | 创建/更新会话连续性账本 |
| `/ztl-coder-search` | 搜索过去的计划、设计和账本 |
| `/ztl-coder-review` | Plannotator 可视化代码审查 |
| `/ztl-coder-annotate` | Plannotator 标注 Markdown 文件 |
| `/ztl-coder-last` | Plannotator 标注最后一条消息 |

### MCP Tools (6个)

| Tool | 用途 |
|------|------|
| `ztl_code_look_at` | 查看文件结构 |
| `ztl_code_artifact_search` | 搜索工件 |
| `ztl_code_ast_grep_search` | AST 代码搜索 |
| `ztl_code_ast_grep_replace` | AST 代码替换 |
| `ztl_code_pty_spawn/write/read/list/kill` | PTY 会话管理 |

### Hooks (4个)

| Hook | 触发条件 | 功能 |
|------|----------|------|
| SessionStart | startup/resume/clear/compact | 注入插件信息 |
| PermissionRequest | ExitPlanMode | 触发 Plannotator 可视化审查 |
| PreToolUse | Write\|Edit | 思考模式提示 |
| PostToolUse | Write | 工件索引 |

## 工作流

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Brainstorm  │ ──► │    Plan     │ ──► │  Implement  │ ──► │   Review    │
│             │     │             │     │             │     │             │
│ 细化需求    │     │ 创建计划    │     │ 执行任务    │     │ 验证代码    │
│ 探索设计    │     │ 分解任务    │     │ 编写代码    │     │ 检查质量    │
│             │     │             │     │             │     │             │
│             │     │ ▼ Plannotator│     │             │     │ ▼ Plannotator│
│             │     │   可视化    │     │             │     │   标注      │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │                   │
       ▼                   ▼                   ▼                   ▼
  designs/            plans/              worktree            approved
  YYYY-MM-DD          YYYY-MM-DD          isolated            or fixed
```

## 配置

### .mcp.json

```json
{
  "mcpServers": {
    "ztl-code": {
      "command": "node",
      "args": ["${CLAUDE_PLUGIN_ROOT}/mcp-server/dist/index.js"],
      "env": {}
    }
  }
}
```

### ztl_coder.json (可选)

```json
{
  "agents": {
    "commander": { "temperature": 0.2 },
    "brainstormer": { "temperature": 0.8 },
    "octto": { "temperature": 0.7 }
  },
  "features": {
    "mindmodelInjection": true,
    "visualPlanReview": true
  },
  "compactionThreshold": 0.5
}
```

## 外部依赖

### Plannotator (可视化计划审查)

安装 CLI：
```bash
# macOS / Linux / WSL
curl -fsSL https://plannotator.ai/install.sh | bash

# Windows PowerShell
irm https://plannotator.ai/install.ps1 | iex
```

功能：
- ExitPlanMode Hook: 计划完成时自动打开可视化 UI
- 行内标注：删除、插入、替换、评论
- 计划差异：查看修订变更
- 团队共享：端到端加密分享

## 工件存储

`thoughts/` 目录存储运行时生成的工件：

- `ledgers/` - 会话连续性账本，格式: `CONTINUITY_YYYY-MM-DD.md`
- `shared/designs/` - 设计文档，格式: `YYYY-MM-DD-topic.md`
- `shared/plans/` - 实现计划，格式: `YYYY-MM-DD-feature.md`
