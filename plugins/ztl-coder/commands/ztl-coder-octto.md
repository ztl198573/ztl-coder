---
description: 启动交互式头脑风暴会话，allowed-tools: Agent, Read, Glob, Grep, Bash, Write, Edit, EnterPlanMode, AskUserQuestion
---

## 上下文

你正在启动 Octto - 一个基于浏览器的交互式头脑风暴代理。

## 任务

1. 调用 ztl-coder:octto 代理
2. 传递用户的主题或问题给代理
3. 如果用户没有提供具体主题，引导用户描述他们想要探索的问题或需求

## 参数

$ARGUMENTS - 用户提供的主题或问题描述

## 调用代理

使用 Agent 工具调用 ztl-coder:octto 代理，传递用户的主题。
