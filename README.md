# ztl_coder

Claude Code 插件，提供结构化的 **Brainstorm → Plan → Implement → Review** 工作流，集成 **Plannotator** 可视化计划审查功能。

## 安装

### 前置要求

安装 Plannotator CLI（用于可视化计划审查）：

**macOS / Linux / WSL:**
```bash
curl -fsSL https://plannotator.ai/install.sh | bash
```

**Windows PowerShell:**
```powershell
irm https://plannotator.ai/install.ps1 | iex
```

### 从 Gitee 安装

```bash
# 添加 Gitee marketplace
claude plugins marketplace add https://gitee.com/ass2in/ztl-coder.git

# 安装插件
claude plugins install ztl-coder

# 重要：安装后重启 Claude Code
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
| `ztl-coder-octto` | 浏览器交互式头脑风暴，集成可视化反馈 |
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
| `/ztl-coder-review` | 可视化代码审查（git diff 或 GitHub PR） |
| `/ztl-coder-annotate` | 可视化标注任何 Markdown 文件 |
| `/ztl-coder-last` | 标注最后一条助手消息 |

## Plannotator 可视化审查

### 功能特性

| 功能 | 触发方式 | 描述 |
|------|----------|------|
| **计划审查** | ExitPlanMode Hook | 计划完成时自动打开可视化 UI |
| **代码审查** | `/ztl-coder-review` | 审查 git diff 或 GitHub PR |
| **文件标注** | `/ztl-coder-annotate` | 标注任何 Markdown 文件 |
| **消息标注** | `/ztl-coder-last` | 标注最后一条助手消息 |
| **计划差异** | 自动 | 查看计划修订时的变更 |

### 工作原理

1. 当 Agent 完成计划时，自动打开 Plannotator UI
2. 用户可以进行行内标注（删除、插入、替换、评论）
3. **批准** → Agent 继续执行实现
4. **请求修改** → 标注转换为结构化反馈，Agent 修订计划

### 团队协作

- **小型计划**：完全编码在 URL 中，无需服务器
- **大型计划**：使用端到端加密的短链接服务
  - AES-256-GCM 加密
  - 服务器只存储密文
  - 解密密钥仅存在于分享的 URL 中
  - 自动删除：7 天后过期

## 工作流

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Brainstorm  │ ──► │    Plan     │ ──► │  Implement  │ ──► │   Review    │
│             │     │             │     │             │     │             │
│ 细化需求    │     │ 创建计划    │     │ 执行任务    │     │ 验证代码    │
│ 探索设计    │     │ 分解任务    │     │ 编写代码    │     │ 检查质量    │
│             │     │             │     │             │     │             │
│             │     │ ▼ 可视化    │     │             │     │ ▼ 可视化    │
│             │     │   审查      │     │             │     │   标注      │
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
│   │   ├── ztl-coder-octto/SKILL.md         # 交互式头脑风暴
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

### 复杂功能开发（带可视化审查）

```
用户: 我需要添加一个用户认证系统
Claude: [使用 ztl-coder-brainstormer skill]
        让我先了解需求...
        [提问并探索代码库]
        [创建设计文档]
        [使用 ztl-coder-planner skill 创建计划]
        [ExitPlanMode Hook 触发]
        [Plannotator UI 打开，用户进行可视化标注]
        [收到反馈后修订计划]
        [使用 ztl-coder-implementer + ztl-coder-reviewer 执行]
```

### 可视化代码审查

```
用户: /ztl-coder-review
Claude: [打开 Plannotator UI]
        显示当前 git diff
        用户进行行内标注
        反馈发送给 Agent 进行处理
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
    },
    "octto": {
      "temperature": 0.7
    }
  },
  "features": {
    "mindmodelInjection": true,
    "visualPlanReview": true
  },
  "compactionThreshold": 0.5
}
```

## MCP 工具

| 工具 | 描述 |
|------|------|
| `ztl_code_look_at` | 查看文件结构 |
| `ztl_code_artifact_search` | 搜索工件 |
| `ztl_code_ast_grep_search` | AST 代码搜索 |
| `ztl_code_ast_grep_replace` | AST 代码替换 |
| `ztl_code_pty_*` | PTY 会话管理 |

## 仓库

- **Gitee**: https://gitee.com/ass2in/ztl-coder

## 致谢

- [Plannotator](https://github.com/backnotprop/plannotator) - 可视化计划审查

## 许可证

MIT
