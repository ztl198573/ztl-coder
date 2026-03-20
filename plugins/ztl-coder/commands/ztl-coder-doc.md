---
description: 管理项目文档，包括同步、归档、清理和验证
allowed-tools: Agent, Read, Glob, Grep, Bash, Write, Edit
---

## 上下文

你正在启动 Doc Manager - 文档管理代理。

## 任务

1. 调用 ztl-coder:doc-manager 代理
2. 传递用户的文档管理请求
3. 支持以下操作：
   - **sync** - 同步文档与代码
   - **archive** - 归档过时文档
   - **cleanup** - 清理临时文档
   - **validate** - 验证文档完整性
   - **structure** - 重组文档结构

## 参数

$ARGUMENTS - 用户的文档管理指令

## 调用代理

使用 Agent 工具调用 ztl-coder:doc-manager 代理，传递用户的指令。

## 示例

```
/ztl-coder-doc sync api          # 同步 API 文档
/ztl-coder-doc archive old-plans # 归档旧计划
/ztl-coder-doc cleanup           # 清理临时文档
/ztl-coder-doc validate          # 验证文档完整性
```
