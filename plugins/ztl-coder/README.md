# ztl_coder

Claude Code 插件，提供结构化的 **Brainstorm → Plan → Implement → Review** 工作流。

## 安装

### 从 Gitee 安装

```bash
# 添加 Gitee marketplace
claude plugins marketplace add https://gitee.com/ass2in/ztl-coder.git

# 安装插件
claude plugins install ztl-coder
```

### 本地安装

```bash
# 克隆仓库
git clone https://gitee.com/ass2in/ztl-coder.git

# 添加本地 marketplace
claude plugins marketplace add /path/to/ztl-coder

# 安装插件
claude plugins install ztl-coder
```

## 验证安装

```bash
# 检查插件是否加载
claude plugins list

# 或者在 Claude Code 会话中使用
> /ztl-coder-search
> /ztl-coder-init
```

## 可用技能

| 技能 | 描述 |
|------|------|
| `ztl-coder-commander` | 主编排器，协调复杂任务 |
| `ztl-coder-brainstormer` | 设计探索，细化需求 |
| `ztl-coder-planner` | 创建实现计划 |
| `ztl-coder-implementer` | 执行任务 |
| `ztl-coder-reviewer` | 代码审查 |
| `ztl-coder-executor` | 编排 implement→review 循环 |
| `ztl-coder-ledger-creator` | 创建会话连续性账本 |
| `ztl-coder-project-initializer` | 初始化项目文档 |
| `ztl-coder-artifact-searcher` | 搜索历史工件 |

## 命令

| 命令 | 描述 |
|------|------|
| `/ztl-coder-init` | 生成 ARCHITECTURE.md 和 CODE_STYLE.md |
| `/ztl-coder-ledger` | 创建/更新会话连续性账本 |
| `/ztl-coder-search` | 搜索过去的计划、设计和账本 |

## 工作流

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

## 目录结构

```
ztl_coder/
├── .claude-plugin/
│   ├── skills/                         # Claude Code Skills
│   │   ├── ztl-coder-commander/SKILL.md     # 主编排器
│   │   ├── ztl-coder-brainstormer/SKILL.md  # 设计探索
│   │   ├── ztl-coder-planner/SKILL.md       # 实现计划
│   │   ├── ztl-coder-implementer/SKILL.md   # 任务执行
│   │   ├── ztl-coder-reviewer/SKILL.md      # 代码审查
│   │   ├── ztl-coder-executor/SKILL.md      # 执行协调
│   │   ├── ztl-coder-ledger-creator/SKILL.md # 账本创建
│   │   ├── ztl-coder-project-initializer/SKILL.md # 项目初始化
│   │   └── ztl-coder-artifact-searcher/SKILL.md # 工件搜索
│   ├── hooks/
│   │   └── hooks.json                  # 会话钩子配置
│   ├── plugin.json                     # 插件配置
│   └── marketplace.json                # Marketplace 配置
├── thoughts/                           # 工件存储（运行时创建）
│   ├── ledgers/                        # 会话账本
│   └── shared/
│       ├── designs/                    # 设计文档
│       └── plans/                      # 实现计划
├── package.json                        # NPM 配置
└── README.md                           # 本文档
```

## 使用示例

### 开始新项目

```
用户: /ztl-coder-init
Claude: [使用 ztl-coder-project-initializer skill]
        分析项目结构...
        创建 ARCHITECTURE.md
        创建 CODE_STYLE.md
```

### 复杂功能开发

```
用户: 我需要添加一个用户认证系统
Claude: [使用 ztl-coder-brainstormer skill]
        让我先了解需求...
        [提问并探索代码库]
        [创建设计文档]
        [使用 ztl-coder-planner skill 创建计划]
        [使用 ztl-coder-implementer + ztl-coder-reviewer 执行]
```

### 会话连续性

```
用户: /ztl-coder-ledger
Claude: [使用 ztl-coder-ledger-creator skill]
        创建 thoughts/ledgers/CONTINUITY_2026-03-19.md
        记录当前进度和上下文
```

## 配置

### ztl_coder.json

在项目根目录创建 `ztl_coder.json` 进行自定义配置：

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

## 仓库

- **Gitee**: https://gitee.com/ass2in/ztl-coder

## 许可证

MIT
