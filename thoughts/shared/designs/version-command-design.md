# 版本信息命令设计文档

**会话 ID:** OCTTO-2026-03-20-001
**日期:** 2026-03-20
**主题:** 为 ztl_coder 项目添加版本信息命令 `/ztl-coder-version`

## 1. 背景与目标

### 1.1 背景
ztl_coder 插件目前有 10 个命令、15 个代理、10 个 MCP 工具、4 个钩子。用户需要一个快速查看插件状态的方式。

### 1.2 目标
创建 `/ztl-coder-version` 命令，显示：
- 插件版本号
- 已安装代理数量
- 命令数量
- MCP 工具数量
- 钩子数量
- 其他相关信息

## 2. 探索路径

### 路径 A: 静态信息命令（推荐）
**描述:** 命令文件中硬编码版本信息，每次发布时手动更新

**优点:**
- 实现简单
- 无需运行时计算
- 响应速度快

**缺点:**
- 版本更新时需要手动维护
- 统计数据可能过时

### 路径 B: 动态计算命令
**描述:** 命令执行时动态扫描目录计算代理/命令数量

**优点:**
- 数据始终准确
- 无需手动维护

**缺点:**
- 实现复杂
- 需要文件系统访问
- 响应较慢

### 路径 C: 混合方案
**描述:** 版本号静态存储，统计数据动态计算

**优点:**
- 版本号稳定
- 统计数据准确

**缺点:**
- 实现中等复杂度

## 3. 推荐方案：路径 A（静态信息命令）

选择路径 A 的理由：
1. 简单可靠，符合项目现有模式
2. 版本信息变化频率低，手动维护成本可接受
3. 命令文件格式与现有命令一致
4. 避免运行时文件系统操作

## 4. 详细设计

### 4.1 命令文件位置
```
plugins/ztl-coder/commands/ztl-coder-version.md
```

### 4.2 命令内容结构

```markdown
---
description: 显示 ztl_coder 插件版本和统计信息
allowed-tools: Read
---

## 任务

显示 ztl_coder 插件的版本信息和统计摘要。

## 输出格式

输出以下信息：

### ztl_coder 插件信息

| 项目 | 值 |
|------|-----|
| 版本 | 4.5.0 |
| 描述 | Claude Code plugin with workflow automation... |
| 许可证 | MIT |
| 作者 | ztl |

### 组件统计

| 组件类型 | 数量 |
|----------|------|
| 主代理 (Primary Agents) | 3 |
| 子代理 (Subagents) | 12 |
| 命令 (Commands) | 11 |
| MCP 工具 (Tools) | 10 |
| 钩子 (Hooks) | 4 |

### 可用命令列表

| 命令 | 描述 |
|------|------|
| /ztl-coder-version | 显示版本信息 |
| /ztl-coder-init | 初始化项目文档 |
| ... | ... |

### 可用代理列表

| 代理 | 类型 | 描述 |
|------|------|------|
| ztl-coder:commander | Primary | 主编排器 |
| ztl-coder:brainstormer | Primary | 设计探索 |
| ztl-coder:octto | Primary | 交互式头脑风暴 |
| planner | Subagent | 创建实现计划 |
| ... | ... | ... |

## 规则

- 信息基于 plugin.json 和目录结构
- 保持输出格式整洁
- 使用表格呈现
```

### 4.3 实现步骤

1. **创建命令文件**
   - 在 `plugins/ztl-coder/commands/` 目录创建 `ztl-coder-version.md`
   - 包含 frontmatter（description, allowed-tools）
   - 定义输出模板和任务说明

2. **更新 ARCHITECTURE.md**
   - 在命令列表中添加 `/ztl-coder-version`
   - 更新命令数量（10 -> 11）

3. **更新 plugin.json**（可选）
   - 版本号保持不变或根据需要更新

## 5. 完整命令内容

```markdown
---
description: 显示 ztl_coder 插件版本和统计信息
allowed-tools: Read
---

## 上下文

你正在显示 ztl_coder 插件的版本信息和组件统计。

## 任务

读取插件配置并输出格式化的版本信息摘要。

## 输出格式

请按以下格式输出信息：

### ztl_coder 插件信息

| 项目 | 值 |
|------|-----|
| 版本 | 4.5.0 |
| 描述 | Claude Code plugin with workflow automation, enhanced UX, structured logging, and interactive wizards |
| 许可证 | MIT |
| 作者 | ztl |

### 组件统计

| 组件类型 | 数量 |
|----------|------|
| 主代理 (Primary Agents) | 3 |
| 子代理 (Subagents) | 12 |
| 命令 (Commands) | 11 |
| MCP 工具 (Tools) | 10 |
| 钩子 (Hooks) | 4 |

### 可用命令

| 命令 | 用途 |
|------|------|
| /ztl-coder-version | 显示版本和统计信息 |
| /ztl-coder-init | 初始化项目文档 |
| /ztl-coder-ledger | 创建/更新会话账本 |
| /ztl-coder-search | 搜索历史工件 |
| /ztl-coder-review | Plannotator 可视化代码审查 |
| /ztl-coder-annotate | Plannotator 标注 Markdown 文件 |
| /ztl-coder-last | Plannotator 标注最后一条消息 |
| /ztl-coder-doc | 文档管理操作 |
| /ztl-coder-octto | 启动 Octto 头脑风暴 |
| /ztl-coder-brainstormer | 启动 Brainstormer |
| /ztl-coder-commander | 启动 Commander |

### 可用代理

**主代理 (可直接调用):**

| 代理 | 描述 |
|------|------|
| ztl-coder:commander | 主编排器，协调复杂任务 |
| ztl-coder:brainstormer | 设计探索，细化需求 |
| ztl-coder:octto | 交互式头脑风暴 + 可视化反馈 |

**子代理 (代理协调调用):**

| 代理 | 描述 |
|------|------|
| planner | 创建实现计划 |
| executor | 编排 implement-review 循环 |
| implementer | 执行单个任务 (TDD) |
| reviewer | 代码审查 |
| e2e-tester | E2E 前端自动化测试 |
| doc-manager | 文档管理 |
| codebase-locator | 查找文件位置 |
| codebase-analyzer | 深度模块分析 |
| pattern-finder | 查找现有模式 |
| project-initializer | 初始化项目文档 |
| ledger-creator | 创建会话账本 |
| artifact-searcher | 搜索历史工件 |

### MCP 工具

| 工具 | 用途 |
|------|------|
| ztl_code_look_at | 查看文件结构 |
| ztl_code_artifact_search | 搜索工件 |
| ztl_code_ast_grep_search | AST 代码搜索 |
| ztl_code_ast_grep_replace | AST 代码替换 |
| ztl_code_pty_spawn | 创建 PTY 会话 |
| ztl_code_pty_write | 写入 PTY 会话 |
| ztl_code_pty_read | 读取 PTY 输出 |
| ztl_code_pty_list | 列出 PTY 会话 |
| ztl_code_pty_kill | 终止 PTY 会话 |

### 钩子

| 钩子 | 触发条件 | 功能 |
|------|----------|------|
| SessionStart | startup/resume/clear/compact | 注入插件信息 |
| PreToolUse | Write/Edit | 思考模式提示 |
| PostToolUse | Write | 工件索引 |

## 规则

- 保持输出格式整洁美观
- 使用表格呈现结构化数据
- 信息基于 plugin.json 和目录结构
```

## 6. 文件变更清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `plugins/ztl-coder/commands/ztl-coder-version.md` | 新建 | 版本信息命令 |
| `ARCHITECTURE.md` | 更新 | 命令列表增加版本命令 |

## 7. 测试计划

1. 使用 `/ztl-coder-version` 命令
2. 验证输出格式正确
3. 确认所有统计数字准确
4. 检查表格渲染正常

## 8. 维护说明

当以下情况发生时，需要更新此命令文件：
- 版本号变更（plugin.json）
- 新增/删除代理
- 新增/删除命令
- 新增/删除 MCP 工具
- 新增/删除钩子

---

## 可视化审查

此设计文档已准备就绪，可以进行可视化审查。

**下一步操作:**
1. 用户通过 Plannotator 进行行内标注
2. 根据反馈修订设计
3. 确认后执行实现

**建议调用的子代理:**
- `implementer` - 实现命令文件和文档更新
