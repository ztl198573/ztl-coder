# ztl_coder

Claude Code 插件。提供结构化的 **Brainstorm → Plan → Implement → Review** 工作流，集成 **Plannotator** 可视化计划审查功能。

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

## 快速启动命令

| 命令 | 描述 |
|------|------|
| `/ztl-coder-octto` | 启动交互式头脑风暴，支持可视化反馈 |
| `/ztl-coder-brainstormer` | 启动设计探索会话 |
| `/ztl-coder-commander` | 启动主编排器，协调复杂任务 |

## 可用的主代理

| 代理 | 描述 |
|------|------|
| `ztl-coder:commander` | 主编排器，协调复杂任务和工作流 |
| `ztl-coder:brainstormer` | 设计探索和需求细化 |
| `ztl-coder:octto` | 基于浏览器的交互式头脑风暴，集成可视化反馈 |

## 可用的子代理

| 代理 | 描述 |
|------|------|
| `planner` | 创建实现计划 |
| `executor` | 编排 implement→review 循环 |
| `implementer` | 执行具体任务（TDD 模式） |
| `reviewer` | 代码审查 |
| `e2e-tester` | E2E 前端自动化测试 |
| `doc-manager` | 文档管理（同步、归档、清理、验证） |
| `codebase-locator` | 查找文件位置 |
| `codebase-analyzer` | 深度模块分析 |
| `pattern-finder` | 查找现有模式 |
| `project-initializer` | 初始化项目文档 |
| `ledger-creator` | 创建连续性账本 |
| `artifact-searcher` | 搜索历史工作 |

## 命令

| 命令 | 描述 |
|------|------|
| `/ztl-coder-init` | 初始化项目，生成 ARCHITECTURE.md 和 CODE_STYLE.md |
| `/ztl-coder-ledger` | 创建/更新连续性账本 |
| `/ztl-coder-search` | 搜索历史交接、计划、可用账本 |
| `/ztl-coder-review` | 交互式代码审查，支持可视化标注 |
| `/ztl-coder-annotate` | 标注任意 markdown 文件 |
| `/ztl-coder-last` | 标注最后一条代理消息 |
| `/ztl-coder-doc` | 管理项目文档（同步、归档、清理、验证） |

## MCP 工具

| 工具 | 描述 |
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

## 工作流

```
头脑风暴 → 计划(可视化审查) → 实现(TDD) → 审查(可视化标注) → E2E测试 → 文档更新
```

### 计划审查

退出计划模式时，会自动打开 Plannotator 可视化 UI，进行行内标注。

### E2E 测试

使用 Playwright 进行浏览器自动化测试
收集前后端错误（console、网络、JS 异常）

### 文档管理

自动同步代码与文档
归档过时设计文档
清理临时文件

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
    "visualPlanReview": true,
    "e2eTesting": true,
    "autoDocSync": true
  },
  "compactionThreshold": 0.5
}
```

## 仓库

- **Gitee**: https://gitee.com/ass2in/ztl-coder

## 致谢

- [Plannotator](https://github.com/backnotprop/plannotator) - 可视化计划审查

## 许可证

MIT
