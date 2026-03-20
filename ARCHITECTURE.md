# ztl_coder 架构

## 概述

ztl_coder 是一个 Claude Code 插件。提供结构化的 **Brainstorm → Plan → Implement → Review** 工作流，集成 **Plannotator** 可视化计划审查功能。通过三层架构（Agent → Subagent → MCP Tool）实现复杂任务的可靠交付。

## 技术栈

- 语言: TypeScript, Markdown
- 平台: Claude Code Plugin System v3.1.0
- 运行时: Bun / Node.js
- MCP: @modelcontextprotocol/sdk
- 外部集成: Plannotator (可视化审查)
- E2E 测试: Playwright

## 架构层次

```
┌─────────────────────────────────────────────────────────────┐
│                    Primary Agents (3)                        │
│  ztl-coder:commander | ztl-coder:brainstormer | ztl-coder:octto │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Subagents (12)                             │
│  planner | executor | implementer | reviewer | e2e-tester   │
│  doc-manager | codebase-locator | codebase-analyzer         │
│  pattern-finder | project-initializer | ledger-creator      │
│  artifact-searcher                                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    MCP Tools (10)                            │
│  ztl_code_look_at | ztl_code_artifact_search                 │
│  ztl_code_ast_grep_search | ztl_code_ast_grep_replace        │
│  ztl_code_pty_* (spawn/write/read/list/kill)                 │
└─────────────────────────────────────────────────────────────┘
```

## 目录结构

```
ztl_coder/
├── plugins/ztl-coder/
│   ├── .claude-plugin/
│   │   └── plugin.json               # 插件定义 v4.5.0
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
│   │       ├── e2e-tester.md         # E2E 自动化测试
│   │       ├── doc-manager.md        # 文档管理
│   │       ├── codebase-locator.md
│   │       ├── codebase-analyzer.md
│   │       ├── pattern-finder.md
│   │       ├── project-initializer.md
│   │       ├── ledger-creator.md
│   │       └── artifact-searcher.md
│   ├── commands/                     # 斜杠命令
│   │   ├── ztl-coder-octto.md        # 快速启动 Octto
│   │   ├── ztl-coder-brainstormer.md # 快速启动 Brainstormer
│   │   ├── ztl-coder-commander.md    # 快速启动 Commander
│   │   ├── ztl-coder-init.md
│   │   ├── ztl-coder-ledger.md
│   │   ├── ztl-coder-search.md
│   │   ├── ztl-coder-review.md
│   │   ├── ztl-coder-annotate.md
│   │   ├── ztl-coder-last.md
│   │   └── ztl-coder-doc.md          # 文档管理命令
│   ├── hooks/
│   │   └── hooks.json                # 会话钩子配置
│   └── scripts/
│       ├── session-start.sh          # SessionStart hook
│       ├── plannotator-hook.sh       # ExitPlanMode hook
│       ├── think-mode-trigger.sh     # PreToolUse hook
│       ├── artifact-indexer.sh       # PostToolUse hook
│       └── install-plannotator.sh
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
│   ├── tools/
│   │   ├── e2e-testing/              # E2E 测试模块
│   │   │   ├── index.ts
│   │   │   ├── types.ts
│   │   │   ├── browser-session.ts
│   │   │   └── error-collector.ts
│   │   ├── pty-manager/              # PTY 管理器
│   │   ├── ast-search/               # AST 搜索
│   │   ├── code-index/               # 代码索引
│   │   ├── workflow/                 # 工作流
│   │   │   ├── incremental/          # 增量计划
│   │   │   ├── parallel/             # 并行执行
│   │   │   └── templates/            # 工作流模板
│   │   └── ...
│   └── utils/
│       ├── config.ts
│       ├── logger.ts                 # 结构化日志
│       ├── errors.ts                 # 错误处理
│       ├── output.ts                 # 输出格式化
│       ├── notifications.ts          # 进度通知
│       └── wizard.ts                 # 交互向导
├── thoughts/                         # 运行时工件存储
│   ├── ledgers/                      # 会话连续性账本
│   ├── designs/                      # 设计文档
│   └── shared/
│       ├── designs/
│       └── plans/
├── tests/                            # 测试文件
├── .mcp.json                         # MCP 服务器配置
├── CLAUDE.md                         # 项目规则
├── package.json                      # NPM 配置
└── README.md                         # 项目文档
```

## 核心组件

### Primary Agents (3个)

| Agent | 职责 | 使用场景 |
|-------|------|----------|
| `ztl-coder:commander` | 主编排器，协调复杂任务 | 复杂功能开发，多步骤任务 |
| `ztl-coder:brainstormer` | 设计探索，细化需求 | 需求不明确，需要探索方案 |
| `ztl-coder:octto` | 交互式头脑风暴 + 可视化反馈 | 协作设计，计划审查 |

### Subagents (12个)

| Subagent | 职责 |
|----------|------|
| `planner` | 创建实现计划 |
| `executor` | 编排 implement→review 循环 |
| `implementer` | 执行单个任务 (TDD) |
| `reviewer` | 代码审查 |
| `e2e-tester` | E2E 前端自动化测试 |
| `doc-manager` | 文档管理（同步、归档、清理、验证） |
| `codebase-locator` | 查找文件位置 |
| `codebase-analyzer` | 深度模块分析 |
| `pattern-finder` | 查找现有模式 |
| `project-initializer` | 初始化项目文档 |
| `ledger-creator` | 创建会话账本 |
| `artifact-searcher` | 搜索历史工件 |

### Commands (10个)

| Command | 用途 |
|---------|------|
| `/ztl-coder-octto` | 快速启动 Octto 头脑风暴 |
| `/ztl-coder-brainstormer` | 快速启动 Brainstormer 设计探索 |
| `/ztl-coder-commander` | 快速启动 Commander 主编排器 |
| `/ztl-coder-init` | 初始化项目文档 |
| `/ztl-coder-ledger` | 创建/更新会话连续性账本 |
| `/ztl-coder-search` | 搜索历史工件 |
| `/ztl-coder-review` | Plannotator 可视化代码审查 |
| `/ztl-coder-annotate` | Plannotator 标注 Markdown 文件 |
| `/ztl-coder-last` | Plannotator 标注最后一条消息 |
| `/ztl-coder-doc` | 文档管理（同步、归档、清理、验证） |

### MCP Tools (10个)

| Tool | 用途 |
|------|------|
| `ztl_code_look_at` | 查看文件结构 |
| `ztl_code_artifact_search` | 搜索工件 |
| `ztl_code_ast_grep_search` | AST 代码搜索 |
| `ztl_code_ast_grep_replace` | AST 代码替换 |
| `ztl_code_pty_spawn` | 创建 PTY 会话 |
| `ztl_code_pty_write` | 写入 PTY 会话 |
| `ztl_code_pty_read` | 读取 PTY 输出 |
| `ztl_code_pty_list` | 列出所有 PTY 会话 |
| `ztl_code_pty_kill` | 终止 PTY 会话 |

### Hooks (4个)

| Hook | 触发条件 | 功能 |
|------|----------|------|
| SessionStart | startup/resume/clear/compact | 注入插件信息 |
| PermissionRequest | ExitPlanMode | 触发 Plannotator 可视化审查 |
| PreToolUse | Write\|Edit | 思考模式提示 |
| PostToolUse | Write | 工件索引 |

## 工作流

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Brainstorm  │ ──► │    Plan     │ ──► │  Implement  │ ──► │   Review    │ ──► │  E2E Test   │
│             │     │             │     │             │     │             │     │             │
│ 细化需求    │     │ 创建计划    │     │ 执行任务    │     │ 验证代码    │     │ 自动化测试  │
│ 探索设计    │     │ 分解任务    │     │ TDD 模式    │     │ 检查质量    │     │ 收集错误    │
│             │     │             │     │             │     │             │     │             │
│             │     │ ▼ Plannotator│     │             │     │ ▼ Plannotator│     │             │
│             │     │   可视化    │     │             │     │   标注      │     │             │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │                   │                   │
       ▼                   ▼                   ▼                   ▼                   ▼
  designs/            plans/              worktree            approved            error report
  YYYY-MM-DD          YYYY-MM-DD          isolated            or fixed            Markdown/JSON
```

## E2E 测试模块

### 架构

```
src/tools/e2e-testing/
├── index.ts              # 模块导出
├── types.ts              # 类型定义
├── browser-session.ts    # 浏览器会话管理
└── error-collector.ts    # 错误收集器
```

### 功能

- **浏览器支持**: Chromium, Firefox, WebKit（自动检测）
- **错误收集**: Console, Network, Runtime, PageError
- **报告格式**: Markdown + JSON
- **协作模式**: 小错误自动修复，大问题上报

## 文档管理模块

### 管理范围

- 项目概览: README.md, CHANGELOG.md
- 架构文档: ARCHITECTURE.md, docs/architecture/
- 技术文档: CODE_STYLE.md, docs/api/
- 用户文档: docs/user-guide/, docs/faq/
- 开发文档: thoughts/plans/, thoughts/designs/
- 规则文档: CLAUDE.md, AGENTS.md, GEMINI.md

### 操作

- **sync** - 同步文档与代码
- **archive** - 归档过时文档
- **cleanup** - 清理临时文档
- **validate** - 验证文档完整性
- **structure** - 重组文档结构

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

### Playwright (E2E 测试)

```bash
bun add playwright && bunx playwright install
```

## 工件存储

`thoughts/` 目录存储运行时生成的工件：

- `ledgers/` - 会话连续性账本，格式: `CONTINUITY_YYYY-MM-DD.md`
- `designs/` - 设计文档，格式: `YYYY-MM-DD-topic.md`
- `shared/plans/` - 实现计划，格式: `YYYY-MM-DD-feature.md`
