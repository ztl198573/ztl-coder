# ztl-coder 插件改进设计文档

**日期:** 2026-03-21
**状态:** 草稿

## 问题陈述

基于端到端测试结果，发现以下三个待改进项：

1. **MCP 工具在新建项目场景未触发**: ast-grep-search、ast-grep-replace、pty-manager 工具在新项目创建时未被使用。
2. **E2E 测试需要完整运行环境**: 缺少 Playwright 浏览器安装、服务启动脚本和测试环境配置。
3. **子代理调用链不够清晰**: 调用链路不透明，缺少统一的追踪和日志关联机制。

## 目标

- 增强 MCP 工具的主动推荐机制，确保在合适场景下被调用
- 提供完整的 E2E 测试环境配置和自动化脚本
- 建立统一的调用链追踪和日志系统

## 非目标

- 不修改 MCP 工具的核心实现逻辑
- 不改变现有的子代理工作流程
- 不添加远程日志上报功能

## 方案

### 改进1: MCP 工具主动推荐机制

**推荐方案**: 在子代理指令中添加工具使用场景指南

在 `commander.md` 和其他子代理的 frontmatter 中，明确列出 MCP 工具的使用场景和触发条件，让子代理在遇到合适场景时主动调用这些工具。

**理由**:
- 实现简单，只需修改文档
- 不影响现有代码逻辑
- 遵循"文档即代码"的理念

### 考虑的替代方案

1. **自动检测并调用**: 在主入口检测代码库状态，自动调用 MCP 工具
   - 优点: 完全自动化
   - 缺点: 可能产生误调用，增加复杂性

2. **添加中间件层**: 在工具调用前后添加检测中间件
   - 优点: 更精细的控制
   - 缺点: 增加代码复杂度，可能影响性能

---

### 改进2: E2E 测试环境配置

**推荐方案**: 创建完整的测试环境配置和自动化脚本

包含以下组件：
1. Playwright 浏览器安装脚本
2. 服务启动/停止脚本
3. 测试环境检查脚本
4. 配置文件模板

**理由**:
- 模块化设计，易于维护
- 支持本地和 CI 环境
- 提供清晰的错误提示

### 考虑的替代方案

1. **Docker 容器化**: 将整个测试环境打包为 Docker 镜像
   - 优点: 环境一致性高
   - 缺点: 增加依赖，启动时间较长

2. **使用云测试服务**: 如 BrowserStack、Sauce Labs
   - 优点: 无需本地配置
   - 缺点: 需要付费，依赖网络

---

### 改进3: 调用链追踪系统

**推荐方案**: 基于现有 telemetry 系统添加调用链追踪

扩展现有的 `telemetry.ts`，添加：
1. 调用链 ID (traceId) 生成和传递
2. 跨代理调用的上下文传递
3. 结构化日志增强

**理由**:
- 复用现有基础设施
- 最小化代码改动
- 保持向后兼容

### 考虑的替代方案

1. **引入 OpenTelemetry**: 使用标准的可观测性框架
   - 优点: 行业标准，功能完整
   - 缺点: 依赖较重，学习曲线陡峭

2. **完全重写日志系统**: 从头设计新的追踪系统
   - 优点: 可以最优设计
   - 缺点: 工作量大，风险高

## 技术设计

### API 设计

#### 改进1: 子代理指令增强

在 `plugins/ztl-coder/agents/` 目录下的子代理定义中添加 `<mcp-tool-guidance>` 部分：

```markdown
<mcp-tool-guidance>
## MCP 工具使用指南

### ast-grep-search
- **触发场景**: 需要查找特定代码模式时（如查找所有 async 函数、查找特定 API 调用）
- **新建项目**: 在初始化后检查生成的代码是否符合模式
- **重构场景**: 批量查找需要修改的代码位置

### ast-grep-replace
- **触发场景**: 需要批量重构代码时（如重命名函数、修改 API 调用）
- **注意事项**: 先用 dryRun: true 预览，确认后再执行

### pty-spawn/pty-read/pty-write/pty-kill
- **触发场景**: 需要后台运行长时间任务时（如开发服务器、测试监视器）
- **典型用例**: 启动 dev server 后运行 E2E 测试
</mcp-tool-guidance>
```

#### 改进2: 测试环境脚本

```bash
# scripts/e2e-setup.sh
#!/bin/bash
# E2E 测试环境设置脚本

set -e

echo "=== E2E 测试环境设置 ==="

# 1. 检查 Playwright
if ! npx playwright --version &> /dev/null; then
    echo "安装 Playwright..."
    npm install -D @playwright/test
fi

# 2. 安装浏览器
echo "安装浏览器..."
npx playwright install chromium

# 3. 检查端口可用性
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "警告: 端口 $1 已被占用"
        return 1
    fi
    return 0
}

check_port 3000 || exit 1

echo "=== 环境设置完成 ==="
```

```bash
# scripts/e2e-run.sh
#!/bin/bash
# E2E 测试运行脚本

set -e

PROJECT_DIR="${1:-.}"
TEST_URL="${2:-http://localhost:3000}"

echo "=== 启动 E2E 测试 ==="
echo "项目目录: $PROJECT_DIR"
echo "测试 URL: $TEST_URL"

# 启动服务（后台）
cd "$PROJECT_DIR"
npm run dev &
SERVER_PID=$!

# 等待服务就绪
echo "等待服务启动..."
for i in {1..30}; do
    if curl -s "$TEST_URL" > /dev/null 2>&1; then
        echo "服务已就绪"
        break
    fi
    sleep 1
done

# 运行测试
npx playwright test

# 清理
kill $SERVER_PID 2>/dev/null || true

echo "=== 测试完成 ==="
```

#### 改进3: 调用链追踪 API

```typescript
// src/utils/tracing.ts

/** 调用链上下文 */
export interface TraceContext {
  traceId: string;
  parentSpanId?: string;
  spanId: string;
  agent?: string;
  tool?: string;
  startTime: number;
}

/** 生成追踪 ID */
export function generateTraceId(): string {
  return `trace_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/** 生成 Span ID */
export function generateSpanId(): string {
  return `span_${Math.random().toString(36).slice(2, 8)}`;
}

/** 创建根上下文 */
export function createRootContext(agent: string): TraceContext {
  return {
    traceId: generateTraceId(),
    spanId: generateSpanId(),
    agent,
    startTime: Date.now(),
  };
}

/** 创建子上下文 */
export function createChildContext(
  parent: TraceContext,
  agent?: string,
  tool?: string
): TraceContext {
  return {
    traceId: parent.traceId,
    parentSpanId: parent.spanId,
    spanId: generateSpanId(),
    agent,
    tool,
    startTime: Date.now(),
  };
}

/** 记录 Span */
export function logSpan(
  ctx: TraceContext,
  message: string,
  fields?: Record<string, unknown>
): void {
  log.info(message, {
    traceId: ctx.traceId,
    spanId: ctx.spanId,
    parentSpanId: ctx.parentSpanId,
    agent: ctx.agent,
    tool: ctx.tool,
    duration: Date.now() - ctx.startTime,
    data: fields,
  });
}
```

### 数据模型

```typescript
// 调用链事件
interface TraceEvent {
  timestamp: string;
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  agent?: string;
  tool?: string;
  event: "start" | "end" | "error";
  message: string;
  duration?: number;
  metadata?: Record<string, unknown>;
}

// E2E 测试配置
interface E2ETestConfig {
  browser: "chromium" | "firefox" | "webkit";
  headless: boolean;
  baseUrl: string;
  timeout: number;
  retries: number;
  screenshotDir: string;
}
```

### 错误处理

| 场景 | 处理方式 |
|------|----------|
| Playwright 未安装 | 提示运行安装脚本，退出测试 |
| 浏览器安装失败 | 提供手动安装指南 |
| 服务启动超时 | 记录日志，提示检查端口 |
| 追踪 ID 丢失 | 生成新的根 ID，记录警告 |

### 测试策略

1. **单元测试**:
   - 测试 `generateTraceId` 唯一性
   - 测试 `createChildContext` 父子关系

2. **集成测试**:
   - 测试完整调用链记录
   - 测试 E2E 环境脚本

3. **端到端测试**:
   - 运行完整的改进后工作流
   - 验证所有 MCP 工具被正确调用

## 实现注意事项

1. **向后兼容**: telemetry 系统改动必须保持向后兼容
2. **性能影响**: 追踪系统应尽量减少对性能的影响
3. **日志大小**: 需要考虑日志文件大小管理
4. **脚本可移植性**: Bash 脚本需要考虑跨平台兼容（Linux/macOS）

## 待解决问题

- [ ] 是否需要支持 Windows 环境的 PowerShell 脚本？
- [ ] 追踪数据的保留策略（保留多少天）？
- [ ] 是否需要添加追踪数据可视化工具？

## 附录：文件变更清单

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `plugins/ztl-coder/agents/primary/ztl-coder-commander.md` | 修改 | 添加 MCP 工具使用指南 |
| `plugins/ztl-coder/agents/subagent/e2e-tester.md` | 修改 | 添加环境检查说明 |
| `src/utils/tracing.ts` | 新增 | 调用链追踪模块 |
| `scripts/e2e-setup.sh` | 新增 | E2E 环境设置脚本 |
| `scripts/e2e-run.sh` | 新增 | E2E 测试运行脚本 |
| `src/utils/telemetry.ts` | 修改 | 集成追踪功能 |
