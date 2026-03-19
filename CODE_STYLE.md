# ztl_coder 代码风格

## 命名约定

| 类型 | 约定 | 示例 |
|------|------|------|
| Agent 文件 | kebab-case, `ztl-coder-` 前缀 | `ztl-coder-commander.md` |
| Subagent 文件 | 简短 kebab-case | `planner.md`, `executor.md` |
| Command 文件 | kebab-case, `ztl-coder-` 前缀 | `ztl-coder-init.md` |
| 脚本文件 | kebab-case.sh | `think-mode-trigger.sh` |
| 工件文件 | 大写前缀 + 日期 | `CONTINUITY_2026-03-19.md` |
| 配置文件 | snake_case 或 camelCase | `plugin.json`, `hooks.json` |
| MCP Tool | snake_case, `ztl_code_` 前缀 | `ztl_code_ast_grep_search` |

## Agent/Command 结构

### Primary Agent Frontmatter

```markdown
---
name: ztl-coder-<name>
description: 简短描述，用于 Agent 列表
tools: Agent, Read, Glob, Grep, Bash, Write, Edit
model: sonnet
permissionMode: default
---

<identity>
{角色定义}
</identity>

<workflow>
{工作流程}
</workflow>

<rules>
{执行规则}
</rules>
```

### Subagent Frontmatter

```markdown
---
description: 简短描述
tools: Read, Glob, Grep
---
```

### Command Frontmatter

```markdown
---
description: 命令描述
allowed-tools: Bash(plannotator:*)
---

## Context
{触发背景}

## Your Task
{具体任务}
```

## TypeScript 代码规范

### 文件顺序

1. Imports (node: 内置模块使用 `node:` 前缀)
2. 导出的 types/constants
3. 内部 constants/schemas
4. 私有 helpers
5. 主工厂/export

### 命名

- 仅使用命名导出，无默认导出
- 使用 `@/*` 别名进行跨文件夹导入
- 类型导入使用 `import type`
- 导出函数需要显式返回类型

### 类型

- 契约优先使用 `interface`
- 联合/别名使用 `type`
- 系统边界使用 `unknown`，配合 Valibot 验证
- 不使用 `any` 类型

### 函数

- 最大函数长度：40 行
- 最大嵌套深度：2 层
- 最大认知复杂度：10
- 所有 promise 必须被 await 或显式处理

## Hooks 配置

### hooks.json 结构

```json
{
  "hooks": {
    "SessionStart": [{ "matcher": "startup|resume", "hooks": [...] }],
    "PermissionRequest": [{ "matcher": "ExitPlanMode", "hooks": [...] }],
    "PreToolUse": [{ "matcher": "Write|Edit", "hooks": [...] }],
    "PostToolUse": [{ "matcher": "Write", "hooks": [...] }]
  }
}
```

### Hook 脚本规范

- 必须可执行 (`chmod +x`)
- 使用 `${CLAUDE_PLUGIN_ROOT}` 变量引用插件根目录
- 从 stdin 读取 JSON 输入
- 通过 stdout 返回附加提示
- exit 0 表示成功

## 工件写入模式

工件写入 `thoughts/` 目录，使用日期前缀：

```
thoughts/
├── ledgers/
│   └── CONTINUITY_2026-03-19.md
└── shared/
    ├── designs/
    │   └── 2026-03-19-auth-system.md
    └── plans/
        └── 2026-03-19-user-auth.md
```

## 错误处理

- 使用 `src/utils/errors.ts` 中的 `extractErrorMessage`
- catch 块中永远不让异常静默失败
- 优雅失败：说明原因并提供替代方案
- 在账本中记录失败原因，便于后续会话恢复

## 反模式

- 不要使用 `any` 类型
- 不要在 hooks 中硬编码绝对路径
- 不要跳过 Brainstorm 阶段直接进入 Implement
- 不要在未获得用户确认的情况下执行破坏性操作
- 不要重复造轮子：优先使用 Claude Code 内置功能
- 不要让 promise 浮动（必须 await 或显式处理）

## 文档约定

### 中文优先

所有面向用户的文本使用中文，包括：

- Agent/Command 描述
- 工件内容
- README 文档

### 技术术语

保留英文标准术语，复杂概念可中英文对照：

- "会话连续性 / Session Continuity"
- "工件 / Artifact"
- "工作树 / Worktree"

### Markdown 格式

- 使用 ATX 风格标题（`#` 而非下划线）
- 表格使用 GFM 语法
- 代码块指定语言标识符
- 链接使用引用式（长文档）或行内式（短文档）

## Git 提交规范

使用约定式提交：

```
<type>(<scope>): <description>

[optional body]

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```

类型：`feat`, `fix`, `docs`, `refactor`, `test`, `chore`
