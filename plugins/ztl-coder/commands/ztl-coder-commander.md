---
description: 启动主编排器代理，协调复杂任务和工作流
allowed-tools: Agent, Read, Glob, Grep, Bash, Write, Edit, EnterPlanMode, ExitPlanMode
---

## 上下文

你正在启动 ztl-coder-commander - 主编排器代理，用于协调复杂任务和工作流。

## 任务

1. 调用 ztl-coder:commander 代理
2. 传递用户的任务描述给代理
3. 如果用户没有提供具体任务，询问用户想要完成什么

## 参数

$ARGUMENTS - 用户提供的任务描述

## 调用代理

使用 Agent 工具调用 `ztl-coder:commander` 代理，传递用户的任务。
