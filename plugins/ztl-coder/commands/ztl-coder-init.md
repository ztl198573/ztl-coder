---
description: 使用 ARCHITECTURE.md 和 CODE_STYLE.md 初始化项目
allowed-tools: Glob, Grep, Read, Write, Edit
---

## 上下文

你正在为这个代码库初始化项目文档。

## 任务

1. 使用 Glob 和 Grep 工具分析项目结构
2. 检测技术栈、框架和模式
3. 如果不存在，生成以下文件：
   - **ARCHITECTURE.md** - 项目结构和约定
   - **CODE_STYLE.md** - 编码标准和模式
4. 创建 `thoughts/` 目录结构用于会话连续性

## 架构模板

```markdown
# {项目名称} 架构

## 概述
{项目用途的简要描述}

## 技术栈
- 语言: {语言}
- 框架: {框架}
- 数据库: {数据库}
- 测试: {测试框架}

## 目录结构
{项目根目录}/
├── src/
├── tests/
└── docs/

## 关键组件
- {组件}: {描述}

## 配置
{环境变量、配置文件}
```

## 代码风格模板

```markdown
# {项目名称} 代码风格

## 命名约定
- 文件: kebab-case
- 类: PascalCase
- 函数: camelCase
- 常量: UPPER_SNAKE_CASE

## 代码模式
- 错误处理: try/catch 并附带具体消息
- 测试: 先写测试（TDD）

## 反模式
- 不要使用 `any` 类型
- 不要跳过测试
```

## 规则

- 先分析现有代码
- 匹配现有模式
- 简洁但有用
- 专注于项目的独特之处
