# ztl-coder 用户手册

**版本**: 1.0.0
**更新日期**: 2026-03-21

---

## 目录

1. [快速开始](#快速开始)
2. [主代理使用](#主代理使用)
3. [子代理使用](#子代理使用)
4. [命令参考](#命令参考)
5. [MCP 工具](#mcp-工具)
6. [TDD 工作流](#tdd-工作流)
7. [调试指南](#调试指南)
8. [配置选项](#配置选项)
9. [最佳实践](#最佳实践)

---

## 快速开始

### 安装后验证

```bash
# 检查插件状态
claude plugins list

# 应该看到
# ztl-coder@1.0.0 (scope: user)
```

### 第一次使用

```bash
# 在项目目录中启动
cd your-project

# 初始化项目文档
/ztl-coder-init

# 启动一个简单的任务
/ztl-coder-commander 帮我添加一个日志工具函数
```

---

## 主代理使用

### ztl-coder-commander（主编排器）

**用途**: 协调完整的开发工作流

**使用场景**:
- 开发新功能
- 修复复杂 bug
- 重构代码
- 端到端任务

**示例**:

```bash
# 开发新功能
/ztl-coder-commander 开发一个用户认证系统，支持邮箱注册和登录

# 修复 bug
/ztl-coder-commander 修复订单支付失败的问题

# 重构
/ztl-coder-commander 重构用户服务，使用领域驱动设计
```

**工作流程**:
1. 分析需求（调用 brainstormer）
2. 创建计划（调用 planner）
3. 实现（调用 executor + implementer）
4. 测试（调用 test-writer）
5. 调试（失败时调用 debugger）
6. 审查（调用 reviewer）
7. 验证（调用 e2e-tester）

---

### ztl-coder-brainstormer（设计探索）

**用途**: 将模糊想法转化为清晰设计

**使用场景**:
- 需求分析
- 技术选型
- 架构设计
- 方案探索

**示例**:

```bash
# 需求分析
/ztl-coder-brainstormer 我需要一个电商购物车

# 技术选型
/ztl-coder-brainstormer 帮我选择合适的数据库方案

# 架构设计
/ztl-coder-brainstormer 设计一个微服务架构
```

**输出**:
- 设计文档: `thoughts/shared/designs/YYYY-MM-DD-*.md`
- 技术决策记录
- 实现建议

---

### ztl-coder-octto（可视化设计）

**用途**: 基于浏览器的交互式设计

**使用场景**:
- 需要 UI 反馈的设计
- 用户交互设计
- 原型验证

**示例**:

```bash
/ztl-coder-octto 设计一个数据看板
```

**特性**:
- 浏览器可视化
- 交互式问答
- 实时反馈

---

## 子代理使用

### 开发类

#### planner（计划器）

**用途**: 创建批次化实现计划

**输出**: `thoughts/shared/plans/YYYY-MM-DD-*.md`

```markdown
# 计划文档格式

## 批次 1: 基础设施
- [ ] 1.1 创建数据库 schema
- [ ] 1.2 配置环境变量
- [ ] 1.3 设置测试框架

## 批次 2: 核心功能
- [ ] 2.1 实现用户模型
- [ ] 2.2 实现认证逻辑
- [ ] 2.3 添加测试
```

#### implementer（实现器）

**用途**: TDD 方式执行具体任务

**工作流程**:
1. **Red**: 先写失败的测试
2. **Green**: 写最小代码通过测试
3. **Refactor**: 优化代码

#### test-writer（测试编写器）

**用途**: 编写单元/集成测试

**支持的测试框架**:
- Vitest（Vite 项目）
- Jest（React/Node.js 项目）
- Bun Test（Bun 项目）
- Pytest（Python 项目）

---

### 调试类

#### debugger（调试器）

**用途**: 根因分析和可观测性增强

**触发条件**: 测试失败时

**工作流程**:
1. 收集错误信息
2. 分析调用链
3. 注入调试日志
4. 定位根因
5. 生成修复方案

**日志工具**:

```typescript
// 入口日志
DebugLog.entry('functionName', { param1, param2 });

// 出口日志
DebugLog.exit('functionName', result);

// 数据变化日志
DebugLog.data('transformation', beforeData, afterData);

// 错误日志
DebugLog.error('functionName', error);
```

---

### 审查类

#### reviewer（代码审查）

**视角**:
- 工程师：代码质量、可维护性
- 架构师：架构一致性、扩展性
- 安全专家：安全漏洞、最佳实践

**输出**: APPROVED / CHANGES_REQUESTED

#### ceo-reviewer（CEO 审查）

**视角**: 商业价值、市场竞争力

**审查要点**:
- 产品价值
- 用户体验
- 市场竞争力
- 成本效益

#### design-reviewer（设计审查）

**视角**: UI/UX 设计

**审查要点**:
- 可用性
- 可访问性
- 视觉一致性
- 交互流畅性

---

## 命令参考

| 命令 | 描述 | 参数 |
|------|------|------|
| `/ztl-coder-commander` | 启动主编排器 | 任务描述 |
| `/ztl-coder-brainstormer` | 启动设计探索 | 主题描述 |
| `/ztl-coder-octto` | 启动可视化设计 | 设计主题 |
| `/ztl-coder-init` | 初始化项目 | 无 |
| `/ztl-coder-ledger` | 创建/更新账本 | 可选描述 |
| `/ztl-coder-search` | 搜索历史工件 | 搜索关键词 |
| `/ztl-coder-doc` | 管理文档 | 操作类型 |
| `/ztl-coder-review` | 代码审查 | 可选文件 |

---

## MCP 工具

### 代码分析

#### ztl_code_look_at

**用途**: 查看文件结构，节省上下文

```typescript
// 示例调用
{
  "filePath": "src/services/user.service.ts",
  "extractSignatures": true
}
```

**输出**: 函数签名、类结构、导出列表

#### ztl_code_ast_grep_search

**用途**: 结构化代码搜索

```typescript
// 搜索所有 async 函数
{
  "pattern": "async function $NAME($PARAMS) { $BODY }"
}

// 搜索特定 API 调用
{
  "pattern": "fetch($URL)"
}
```

#### ztl_code_ast_grep_replace

**用途**: 批量代码替换

```typescript
// 替换 var 为 const
{
  "pattern": "var $NAME = $VALUE",
  "replacement": "const $NAME = $VALUE",
  "dryRun": true  // 先预览
}
```

---

### 进程管理

#### ztl_code_pty_spawn

**用途**: 启动后台进程

```typescript
{
  "command": "npm run dev",
  "name": "dev-server"
}
```

#### ztl_code_pty_read

**用途**: 读取进程输出

```typescript
{
  "sessionId": "dev-server"
}
```

#### ztl_code_pty_kill

**用途**: 终止进程

```typescript
{
  "sessionId": "dev-server"
}
```

---

## TDD 工作流

### Red 阶段

```bash
# 1. 编写失败的测试
# test-writer 自动生成测试用例

# 2. 运行测试，确认失败
npx vitest run src/utils/newFunction.test.ts

# 期望: FAIL（正确原因：函数不存在或行为不正确）
```

### Green 阶段

```bash
# 1. 实现最小代码
# implementer 编写通过测试的最少代码

# 2. 运行测试，确认通过
npx vitest run src/utils/newFunction.test.ts

# 期望: PASS
```

### Refactor 阶段

```bash
# 1. 优化代码结构
# 2. 每次改动后运行测试
# 3. 保持测试通过
```

### 覆盖率要求

| 代码类型 | 行覆盖率 | 函数覆盖率 |
|----------|----------|------------|
| 核心业务 | 100% | 100% |
| 工具函数 | 90% | 90% |
| 组件 | 80% | 80% |

---

## 调试指南

### 启动调试

```bash
# 报告错误
/ztl-coder-commander 测试失败：用户登录返回 401

# debugger 自动：
# 1. 收集错误堆栈
# 2. 分析调用链
# 3. 注入调试日志
# 4. 定位根因
```

### 调试日志格式

```
[2024-03-21T10:30:45.123Z] [DEBUG] [AuthService] ENTRY | {"email":"user@example.com"}
[2024-03-21T10:30:45.234Z] [DEBUG] [AuthService] DATA token | {"before":null,"after":"xxx..."}
[2024-03-21T10:30:45.345Z] [DEBUG] [AuthService] EXIT | {"success":true}
```

### 根因分析方法

#### 5 Whys

```markdown
问题: 用户无法登录

1. Why? API 返回 401
   → Token 验证失败

2. Why? Token 验证失败
   → Token 已过期

3. Why? Token 已过期
   → 没有自动刷新机制

4. Why? 没有刷新机制
   → 开发时未考虑长期会话

5. Why? 未考虑长期会话
   → 【根因】需求遗漏

修复: 添加 Token 自动刷新
```

---

## 配置选项

### ztl_coder.json

```json
{
  "agents": {
    "commander": {
      "temperature": 0.2,
      "maxTurns": 100
    },
    "brainstormer": {
      "temperature": 0.8,
      "maxTurns": 50
    },
    "debugger": {
      "temperature": 0.3
    }
  },
  "features": {
    "tddEnforcement": true,
    "coverageGates": true,
    "debugOnFailure": true,
    "visualPlanReview": true
  },
  "coverage": {
    "core": { "lines": 100, "functions": 100, "branches": 90 },
    "utils": { "lines": 90, "functions": 90, "branches": 80 },
    "components": { "lines": 80, "functions": 80, "branches": 70 }
  },
  "compactionThreshold": 0.5
}
```

---

## 最佳实践

### 1. 明确任务描述

```bash
# 好的描述
/ztl-coder-commander 开发一个 JWT 认证中间件，支持：
1. Token 验证
2. 自动刷新
3. 错误处理

# 不好的描述
/ztl-coder-commander 做个认证
```

### 2. 利用连续性账本

```bash
# 每次重要进展后保存
/ztl-coder-ledger 完成了用户模块的基础架构

# 恢复上下文
/ztl-coder-search 用户模块
```

### 3. 信任 TDD 流程

```bash
# 让插件自动执行 TDD
# 不要跳过测试
# 确保覆盖率达标
```

### 4. 利用多视角审查

```bash
# 启用所有审查视角
/ztl-coder-commander ... --reviewers=all

# 包括：engineer, architect, security, ceo, designer
```

### 5. 及时调试

```bash
# 测试失败时，让 debugger 分析
# 不要盲目修改代码
# 基于证据修复
```

---

## 常见问题

请参阅 [FAQ.md](./FAQ.md)

---

## 获取帮助

- GitHub Issues: https://github.com/ztl/ztl-coder/issues
- Gitee Issues: https://gitee.com/ass2in/ztl-coder/issues
