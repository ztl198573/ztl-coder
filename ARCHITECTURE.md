# ztl_coder 架构

## 概述

ztl_coder 是一个 Claude Code 插件，提供结构化的 **Brainstorm → Plan → Implement → Review** 工作流。通过将复杂任务分解为可管理的阶段，帮助 AI 助手更可靠地交付高质量代码。

## 技术栈

- 语言: Markdown (SKILL.md), JSON (配置)
- 平台: Claude Code Plugin System
- 运行时: Claude Code CLI
- 测试: 手动验证（通过 Claude Code 会话）

## 目录结构

```
ztl_coder/
├── .claude-plugin/
│   ├── marketplace.json              # Marketplace 配置
│   └── plugin.json                   # 插件元数据
├── plugins/
│   └── ztl-coder/
│       ├── .claude-plugin/
│       │   └── plugin.json           # 插件定义
│       ├── commands/                 # 斜杠命令
│       │   ├── ztl-coder-init.md     # 初始化项目文档
│       │   ├── ztl-coder-ledger.md   # 创建会话账本
│       │   └── ztl-coder-search.md   # 搜索历史工件
│       ├── hooks/
│       │   └── hooks.json            # 会话钩子配置
│       ├── skills/                   # 技能定义
│       │   ├── ztl-coder-artifact-searcher/
│       │   ├── ztl-coder-brainstormer/
│       │   ├── ztl-coder-commander/
│       │   ├── ztl-coder-executor/
│       │   ├── ztl-coder-implementer/
│       │   ├── ztl-coder-ledger-creator/
│       │   ├── ztl-coder-planner/
│       │   ├── ztl-coder-project-initializer/
│       │   └── ztl-coder-reviewer/
│       └── README.md
├── thoughts/                         # 运行时工件存储
│   ├── ledgers/                      # 会话连续性账本
│   └── shared/
│       ├── designs/                  # 设计文档
│       └── plans/                    # 实现计划
├── CLAUDE.md                         # 项目规则
├── package.json                      # NPM 配置
└── README.md                         # 项目文档
```

## 核心组件

### 技能 (Skills)

| 技能 | 职责 | 触发时机 |
|------|------|----------|
| `ztl-coder-commander` | 主编排器，协调复杂任务 | 用户请求复杂功能 |
| `ztl-coder-brainstormer` | 设计探索，细化需求 | 需求不明确时 |
| `ztl-coder-planner` | 创建实现计划 | 设计完成后 |
| `ztl-coder-implementer` | 执行单个任务 | 计划批准后 |
| `ztl-coder-reviewer` | 代码审查 | 实现完成后 |
| `ztl-coder-executor` | 编排 implement→review 循环 | 多任务执行时 |
| `ztl-coder-ledger-creator` | 创建会话连续性账本 | `/ztl-coder-ledger` 命令 |
| `ztl-coder-project-initializer` | 初始化项目文档 | `/ztl-coder-init` 命令 |
| `ztl-coder-artifact-searcher` | 搜索历史工件 | `/ztl-coder-search` 命令 |

### 命令 (Commands)

| 命令 | 用途 |
|------|------|
| `/ztl-coder-init` | 生成 ARCHITECTURE.md 和 CODE_STYLE.md |
| `/ztl-coder-ledger` | 创建/更新会话连续性账本 |
| `/ztl-coder-search` | 搜索过去的计划、设计和账本 |

### 工作流阶段

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Brainstorm  │ ──► │    Plan     │ ──► │  Implement  │ ──► │   Review    │
│             │     │             │     │             │     │             │
│ 细化需求    │     │ 创建计划    │     │ 执行任务    │     │ 验证代码    │
│ 探索设计    │     │ 分解任务    │     │ 编写代码    │     │ 检查质量    │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │                   │
       ▼                   ▼                   ▼                   ▼
  designs/            plans/              worktree            approved
  YYYY-MM-DD          YYYY-MM-DD          isolated            or fixed
```

## 配置

### 环境变量

无需环境变量，所有配置通过 `ztl_coder.json` 文件管理。

### ztl_coder.json

在项目根目录创建可选配置文件：

```json
{
  "agents": {
    "commander": {
      "temperature": 0.2
    },
    "brainstormer": {
      "temperature": 0.8
    }
  },
  "features": {
    "mindmodelInjection": true
  },
  "compactionThreshold": 0.5
}
```

## 工件存储

`thoughts/` 目录存储运行时生成的工件：

- `ledgers/` - 会话连续性账本，格式: `CONTINUITY_YYYY-MM-DD.md`
- `shared/designs/` - 设计文档，格式: `YYYY-MM-DD-topic.md`
- `shared/plans/` - 实现计划，格式: `YYYY-MM-DD-feature.md`

## 扩展

添加新技能：

1. 在 `plugins/ztl-coder/skills/` 创建目录 `ztl-coder-<name>/`
2. 创建 `SKILL.md` 文件，包含 `---` frontmatter 和技能内容
3. 在 `README.md` 中添加技能描述

添加新命令：

1. 在 `plugins/ztl-coder/commands/` 创建 `ztl-coder-<name>.md`
2. 在 `README.md` 中添加命令描述
