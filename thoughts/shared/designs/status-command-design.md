# 状态检查命令设计文档

## 概述

为 ztl-coder 插件添加 `/ztl-coder-status` 命令，用于显示插件的当前状态信息。

## 目标

- 提供插件版本和基本信息的快速查看
- 显示已加载的代理列表
- 列出可用命令及其描述
- 展示已启用的功能状态
- 帮助用户了解当前插件配置

## 设计方案

### 命令文件

**路径**: `plugins/ztl-coder/commands/ztl-coder-status.md`

### 命令输出格式

```
# ztl-coder 状态报告

## 基本信息
- **版本**: 4.5.0
- **描述**: Claude Code plugin with workflow automation, enhanced UX, structured logging, and interactive wizards
- **作者**: ztl

## 代理配置
### 主要代理
| 代理名称 | 模型 | 说明 |
|---------|------|------|
| ztl-coder-commander | sonnet | 指挥官代理 |
| ztl-coder-brainstormer | sonnet (temp: 0.8) | 头脑风暴代理 |
| ztl-coder-octto | sonnet | 可视化设计引导代理 |

### 子代理
| 代理名称 | 最大轮次 | 说明 |
|---------|---------|------|
| planner | 20 | 计划子代理 |
| executor | 50 | 执行子代理 |
| implementer | 30 | 实现子代理 |
| reviewer | 15 | 审查子代理 |

## 可用命令
| 命令 | 描述 |
|------|------|
| /ztl-coder-init | 初始化项目文档 |
| /ztl-coder-ledger | 管理会话账本 |
| /ztl-coder-search | 搜索历史工件 |
| /ztl-coder-review | 审查代码变更 |
| /ztl-coder-annotate | 标注文件 |
| /ztl-coder-last | 标注最后一条消息 |
| /ztl-coder-doc | 文档管理 |
| /ztl-coder-brainstormer | 启动头脑风暴会话 |
| /ztl-coder-commander | 启动指挥官模式 |
| /ztl-coder-octto | 启动可视化设计引导 |

## 已启用功能
- thinkMode: 已启用
- ledgerAutoLoad: 已启用
- autoCompact: 已启用
- artifactAutoIndex: 已启用

## 钩子配置
| 钩子类型 | 触发条件 | 说明 |
|---------|---------|------|
| SessionStart | startup/resume/clear/compact | 会话启动时执行初始化脚本 |
| PreToolUse | Write/Edit | 写入/编辑前触发思考模式 |
| PostToolUse | Write | 写入后索引工件 |

## 其他配置
- 压缩阈值: 0.7
- 最大并行子代理数: 10
```

### 命令模板

```markdown
---
description: 显示 ztl-coder 插件的当前状态信息
allowed-tools: Read, Glob
---

## 上下文

你正在显示 ztl-coder 插件的状态报告。

## 任务

读取以下配置文件并生成状态报告:
1. `plugins/ztl-coder/.claude-plugin/plugin.json` - 基本信息和版本
2. `plugins/ztl-coder/settings.json` - 代理和功能配置
3. `plugins/ztl-coder/hooks/hooks.json` - 已注册的钩子
4. 扫描 `plugins/ztl-coder/commands/` 目录获取所有命令

## 输出格式

生成一份清晰的状态报告，包含:

### 基本信息
- 版本号
- 描述
- 作者信息

### 代理配置
列出所有已配置的代理及其:
- 模型类型
- 特殊配置（如温度）
- 用途说明

### 可用命令
列出所有命令及其:
- 命令名称
- 描述（从命令文件的 frontmatter 中提取）

### 已启用功能
显示 features 配置中的功能状态

### 钩子配置
列出已注册的钩子:
- 钩子类型
- 触发条件
- 说明

## 规则

- 使用表格格式呈现列表信息
- 对布尔值功能显示"已启用/已禁用"
- 保持输出简洁但信息完整
- 使用中文输出
```

## 实现步骤

1. 创建命令文件 `plugins/ztl-coder/commands/ztl-coder-status.md`
2. 无需修改代码，命令基于现有配置文件读取信息

## 验收标准

- 命令能正确显示插件版本
- 所有代理配置正确列出
- 所有命令及其描述完整显示
- 功能状态准确展示
- 输出格式清晰易读

## 影响范围

- 新增 1 个文件: `plugins/ztl-coder/commands/ztl-coder-status.md`
- 无代码修改
- 无依赖变更
