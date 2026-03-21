---
description: 启动设计探索会话
allowed-tools: Agent, Read, Glob, Grep, Bash, Write, Edit
---

## 上下文

你正在启动 ztl-coder-brainstormer - 一个设计探索代理。

## 任务

1. 调用 `ztl-coder:brainstormer` 代理
2. 传递用户的主题或问题给代理
3. 如果用户没有提供具体主题，引导用户描述他们想要探索的设计方向

## 参数

$ARGUMENTS - 用户提供的主题或设计问题描述

## 调用代理

使用 Agent 工具调用 `ztl-coder:brainstormer` 代理，传递用户的设计主题。

代理将：
- 通过协作对话完善设计
- 生成设计文档到 `thoughts/shared/designs/`
- 完成后自动调用 planner 创建实现计划
