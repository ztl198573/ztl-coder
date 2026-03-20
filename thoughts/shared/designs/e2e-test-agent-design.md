# E2E 前端自动化测试子代理设计

**设计日期:** 2026-03-20
**状态:** 草案 - 待可视化审查

## 一、需求分析

### 1.1 核心能力需求

| 需求 | 描述 | 优先级 |
|------|------|--------|
| 浏览器自动化 | 控制浏览器执行 E2E 测试 | P0 |
| 错误捕获 | 捕获 console 错误、网络错误、JS 异常 | P0 |
| 错误定位 | 帮助 ztl-coder 定位错误原因 | P0 |
| 修正方案 | 生成可执行的修复建议 | P1 |
| 测试报告 | 生成结构化测试报告 | P1 |

### 1.2 技术选型分析

**浏览器自动化框架:**

| 框架 | 优点 | 缺点 | 推荐度 |
|------|------|------|--------|
| **Playwright** | 跨浏览器、原生错误捕获、活跃维护、TypeScript 友好 | 包体积较大 | **推荐** |
| Puppeteer | 成熟稳定、Chrome 官方 | 仅 Chromium、错误捕获需手动 | 备选 |
| Selenium | 语言支持广 | API 较老、性能一般 | 不推荐 |

**推荐: Playwright**
- 原生支持 `page.on('console')`, `page.on('pageerror')`, `page.on('requestfailed')`
- 自动等待机制，减少 flaky 测试
- 支持并行测试和浏览器上下文隔离

## 二、子代理设计

### 2.1 Agent 配置

```yaml
---
internal: true
name: e2e-tester
description: |
  E2E 前端自动化测试代理。
  使用 Playwright 执行浏览器自动化测试。
  捕获前后端错误（console、网络、JS 异常）。
  生成结构化错误报告供 ztl-coder 定位和修复。
tools: Agent, Read, Glob, Grep, Bash, Write, Edit
model: inherit
maxTurns: 50
---
```

### 2.2 核心工具设计

#### 工具 1: browser-session (浏览器会话管理)

```typescript
interface BrowserSessionOptions {
  action: 'launch' | 'close' | 'newPage' | 'closePage';
  sessionId?: string;
  browserType?: 'chromium' | 'firefox' | 'webkit';
  headless?: boolean;
  viewport?: { width: number; height: number };
}

interface BrowserSessionResult {
  success: boolean;
  sessionId?: string;
  pageId?: string;
  error?: string;
}
```

#### 工具 2: browser-navigate (页面导航)

```typescript
interface NavigateOptions {
  sessionId: string;
  pageId: string;
  url: string;
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
  timeout?: number;
}

interface NavigateResult {
  success: boolean;
  finalUrl: string;
  title: string;
  loadTime: number;
  error?: string;
}
```

#### 工具 3: browser-interact (页面交互)

```typescript
interface InteractOptions {
  sessionId: string;
  pageId: string;
  action: 'click' | 'fill' | 'select' | 'hover' | 'waitFor' | 'screenshot';
  selector: string;
  value?: string;
  timeout?: number;
}

interface InteractResult {
  success: boolean;
  value?: string;
  screenshot?: string;  // base64
  error?: string;
}
```

#### 工具 4: error-collector (错误收集器)

```typescript
interface ErrorCollectorOptions {
  sessionId: string;
  pageId: string;
  action: 'start' | 'stop' | 'getErrors' | 'clear';
  filter?: {
    types?: ('console' | 'network' | 'js' | 'all')[];
    level?: ('error' | 'warning' | 'all')[];
  };
}

interface CollectedError {
  type: 'console' | 'network' | 'js';
  timestamp: string;
  message: string;
  stack?: string;
  url?: string;
  line?: number;
  column?: number;
  request?: { url: string; method: string };
  response?: { status: number; statusText: string };
}

interface ErrorCollectorResult {
  success: boolean;
  errors: CollectedError[];
  summary: {
    total: number;
    byType: Record<string, number>;
    byLevel: Record<string, number>;
  };
}
```

#### 工具 5: test-runner (测试执行器)

```typescript
interface TestRunnerOptions {
  testFile?: string;  // Playwright 测试文件路径
  testDir?: string;   // 或测试目录
  browserType?: 'chromium' | 'firefox' | 'webkit';
  headed?: boolean;
  debug?: boolean;
  grep?: string;      // 过滤测试
  reporters?: ('json' | 'html' | 'junit')[];
}

interface TestRunnerResult {
  success: boolean;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  failures: TestFailure[];
  reportPath?: string;
}

interface TestFailure {
  testName: string;
  error: string;
  stack?: string;
  screenshot?: string;
  video?: string;
  location?: { file: string; line: number };
}
```

### 2.3 输出格式

#### 测试报告格式

```markdown
# E2E 测试报告

**执行时间:** {timestamp}
**测试会话:** {sessionId}
**环境:** {browser} @ {viewport}

## 执行摘要

| 指标 | 值 |
|------|-----|
| 总测试数 | {total} |
| 通过 | {passed} |
| 失败 | {failed} |
| 跳过 | {skipped} |
| 耗时 | {duration}s |

## 错误详情

### 1. Console 错误

| 时间 | 消息 | 来源 |
|------|------|------|
| {timestamp} | {message} | {url}:{line}:{column} |

### 2. 网络错误

| 时间 | 请求 | 状态 | 错误 |
|------|------|------|------|
| {timestamp} | {method} {url} | {status} | {error} |

### 3. JS 异常

| 时间 | 异常 | 堆栈 |
|------|------|------|
| {timestamp} | {message} | {stack} |

## 失败测试

### {testName}

**错误:** {error}

**位置:** `{file}:{line}`

**堆栈:**
```
{stack}
```

**截图:** {screenshotPath}

## 修复建议

### 错误定位

1. **{errorId}**
   - 类型: {type}
   - 文件: `{sourceFile}:{line}`
   - 原因: {rootCauseAnalysis}
   - 建议: {fixSuggestion}

## 下一步

1. [ ] 审查上述错误
2. [ ] 调用 `implementer` 子代理修复问题
3. [ ] 重新运行测试验证
```

## 三、与现有架构集成

### 3.1 集成点

```
┌─────────────────────────────────────────────────────────────┐
│                     ztl-coder-commander                      │
│                      (主编排器)                               │
└─────────────────────────────────────────────────────────────┘
                              │
            ┌─────────────────┼─────────────────┐
            ▼                 ▼                 ▼
    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
    │  implementer │  │   reviewer   │  │  e2e-tester  │  <-- 新增
    │  (实现代理)   │  │  (审查代理)   │  │  (E2E测试)   │
    └──────────────┘  └──────────────┘  └──────────────┘
            │                 │                 │
            └─────────────────┼─────────────────┘
                              ▼
                    ┌──────────────────┐
                    │  错误报告文件     │
                    │  thoughts/tests/ │
                    └──────────────────┘
```

### 3.2 工作流集成

```yaml
# 完整工作流（扩展版）
workflow:
  1_brainstorm:
    agent: brainstormer
    output: thoughts/shared/designs/

  2_plan:
    agent: planner
    output: thoughts/shared/plans/

  3_implement:
    agent: executor
    subagents:
      - implementer (并行)
      - reviewer (并行)

  4_e2e_test:  # 新增阶段
    agent: e2e-tester
    input: 实现完成通知
    output: thoughts/tests/{date}-{session}.md
    on_failure:
      - 分析错误
      - 调用 implementer 修复
      - 重新测试（最多 3 次）

  5_final_review:
    agent: reviewer
    input: E2E 测试通过
    output: 最终审查报告
```

### 3.3 settings.json 更新

```json
{
  "subagents": {
    "e2e-tester": {
      "model": "inherit",
      "maxTurns": 50,
      "tools": [
        "Agent", "Read", "Glob", "Grep", "Bash", "Write", "Edit"
      ]
    }
  }
}
```

## 四、文件结构

```
src/tools/e2e-browser/
├── index.ts              # Barrel export
├── types.ts              # 类型定义
├── session-manager.ts    # 浏览器会话管理
├── page-interactor.ts    # 页面交互
├── error-collector.ts    # 错误收集
├── test-runner.ts        # Playwright 测试执行
└── report-generator.ts   # 报告生成

plugins/ztl-coder/agents/
└── e2e-tester.md         # Agent 配置

thoughts/tests/           # 测试报告输出目录
├── 2026-03-20-session-001.md
├── 2026-03-20-session-002.md
└── ...
```

## 五、待讨论问题

### 5.1 浏览器选择

- [ ] 默认使用 Chromium，还是根据项目自动检测？
- [ ] 是否需要支持移动端视口模拟？

### 5.2 错误处理策略

- [ ] 遇到第一个错误就停止，还是继续收集所有错误？
- [ ] 是否需要自动重试失败的测试？

### 5.3 与 CI/CD 集成

- [ ] 是否需要生成 JUnit XML 报告供 CI 使用？
- [ ] 是否需要支持 GitHub Actions 集成？

### 5.4 资源管理

- [ ] 浏览器实例的最大生命周期？
- [ ] 并行测试的最大数量？
- [ ] 视频录制是否默认开启？

## 六、实现优先级

| 阶段 | 功能 | 预计工时 |
|------|------|----------|
| Phase 1 | 核心工具（session、navigate、interact、error-collector） | 4h |
| Phase 2 | test-runner 和报告生成 | 3h |
| Phase 3 | Agent 配置和工作流集成 | 2h |
| Phase 4 | 与 implementer 的错误修复循环 | 3h |

**总计:** 约 12 小时

## 七、风险和缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| Playwright 依赖体积大 | 安装时间长 | 使用 `npx playwright install chromium` 仅安装必要浏览器 |
| 测试不稳定 (flaky) | 误报错误 | 内置重试机制，等待策略优化 |
| 浏览器资源占用 | 影响其他任务 | 限制并行实例数，及时关闭会话 |
| 错误定位不准确 | 修复效率低 | 结合 source map，提供上下文分析 |
