# ztl_coder 代码风格

## 命名约定

| 类型 | 约定 | 示例 |
|------|------|------|
| 技能目录 | kebab-case, `ztl-coder-` 前缀 | `ztl-coder-brainstormer/` |
| 技能文件 | SKILL.md (大写) | `SKILL.md` |
| 命令文件 | kebab-case, `.md` 后缀 | `ztl-coder-init.md` |
| 工件文件 | 大写前缀 + 日期 | `CONTINUITY_2026-03-19.md` |
| 配置文件 | snake_case 或 camelCase | `ztl_coder.json`, `plugin.json` |

## SKILL.md 结构

每个技能文件遵循以下结构：

```markdown
---
name: ztl-coder-<name>
description: 简短描述
---

## Context
{技能触发背景}

## Your Task
{具体任务描述}

## Rules
{执行规则列表}
```

### Frontmatter 字段

| 字段 | 必填 | 说明 |
|------|------|------|
| `name` | 是 | 技能标识符，与目录名一致 |
| `description` | 是 | 简短描述，用于技能列表 |

## 代码模式

### 技能交互模式

技能应遵循"提问-确认-执行"模式：

1. **分析** - 理解当前状态和需求
2. **提问** - 在不确定时向用户确认
3. **执行** - 完成任务并记录结果

### 工件写入模式

工件应写入 `thoughts/` 目录，使用日期前缀：

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

### 错误处理

- 优雅失败：当条件不满足时，说明原因而非报错
- 提供替代方案：当主要路径不可行时，建议其他方法
- 记录上下文：在账本中记录失败原因，便于后续会话恢复

## 反模式

- 不要在技能中硬编码项目路径
- 不要假设特定技术栈（除非在 CLAUDE.md 中定义）
- 不要跳过 Brainstorm 阶段直接进入 Implement
- 不要在未获得用户确认的情况下执行破坏性操作
- 不要重复造轮子：优先使用已有的 Claude Code 功能

## 文档约定

### 中文优先

所有面向用户的文本使用中文，包括：

- 技能描述
- 命令说明
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

## 版本控制

### Git 提交消息

使用约定式提交：

```
<type>(<scope>): <description>

[optional body]
```

类型：`feat`, `fix`, `docs`, `refactor`, `test`, `chore`

### 变更日志

在 README.md 中记录重要变更，或在 `thoughts/shared/` 中维护 CHANGELOG.md。
