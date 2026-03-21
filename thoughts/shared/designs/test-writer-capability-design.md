# 测试编写能力设计文档

**日期:** 2026-03-21
**状态:** 草稿

## 问题陈述

ztl-coder 插件当前缺乏专门的测试编写能力。虽然 implementer 代理遵循 TDD 方法，但：
1. 缺少专门的测试编写专家代理
2. 没有系统的测试策略制定流程
3. 测试覆盖率验证不完善
4. 多种测试框架（Vitest、Jest、Bun Test、Pytest）支持不统一

## 目标

- 创建专门的测试编写子代理（test-writer）
- 支持多种测试框架和测试类型
- 集成 TDD 工作流到现有执行循环
- 确保每轮开发任务都有对应测试

## 非目标

- 不实现测试框架本身
- 不替代现有的 e2e-tester 代理（专注于 E2E 测试）
- 不实现持续集成/持续部署（CI/CD）功能

## 方案

### 推荐方案：分层测试架构

采用三层测试架构：
1. **test-writer 子代理** - 专门的测试编写专家
2. **集成到 implementer** - 增强 TDD 流程
3. **集成到 executor** - 测试验证阶段

### 考虑的替代方案

1. **扩展 implementer 而非新建代理**
   - 优点：简单，无新代理
   - 缺点：职责过重，难以专门化

2. **创建独立的测试命令**
   - 优点：用户可单独调用
   - 缺点：与开发流程脱节

**选择推荐方案的理由**：保持代理职责单一，同时确保测试与开发紧密集成。

## 技术设计

### 1. test-writer 子代理

**位置**: `plugins/ztl-coder/agents/subagent/test-writer.md`

**职责**：
- 分析代码并识别测试需求
- 选择合适的测试框架
- 编写单元测试、集成测试
- 生成测试覆盖率报告
- 遵循 TDD Red-Green-Refactor 循环

**工具权限**：
- Read, Glob, Grep - 代码分析
- Bash - 运行测试
- Write, Edit - 创建/修改测试文件

### 2. 测试框架检测与配置

自动检测项目使用的测试框架：

| 框架 | 检测文件 | 配置文件 |
|------|----------|----------|
| Vitest | vitest.config.* | vitest.config.ts |
| Jest | jest.config.* | jest.config.js |
| Bun Test | bunfig.toml | 内置 |
| Pytest | pytest.ini, pyproject.toml | pytest.ini |

### 3. 测试类型支持

| 类型 | 用途 | 生成位置 |
|------|------|----------|
| 单元测试 | 测试单个函数/模块 | `tests/unit/` 或 `*.test.ts` |
| 集成测试 | 测试模块间交互 | `tests/integration/` |
| 快照测试 | UI 组件输出 | `__snapshots__/` |
| 回归测试 | 防止已知问题重现 | 随修复生成 |

### 4. 工作流集成

**executor 更新**：
```
批次执行流程:
1. 实现阶段 → implementer
2. 测试阶段 → test-writer (新增)
3. 审查阶段 → reviewer
4. 验证阶段 → 所有测试通过
```

**implementer 更新**：
- 实现前必须先调用 test-writer 编写测试
- Red: 验证测试失败
- Green: 实现代码
- Refactor: 重构并保持测试通过

### API 设计

#### test-writer 调用接口

```markdown
调用 test-writer:
- 源文件: src/utils/logger.ts
- 测试类型: unit
- 框架: auto-detect
- 覆盖率目标: 80%
```

#### 输出格式

```markdown
## 测试报告: {source-file}

**框架**: {detected-framework}
**测试文件**: {test-file-path}
**覆盖率**: {percentage}%

### 测试用例
| 用例 | 描述 | 状态 |
|------|------|------|
| {name} | {desc} | PASS/FAIL |

### 未覆盖代码
- {file}:{line} - {reason}
```

### 数据模型

```typescript
interface TestRequest {
  sourceFile: string;
  testType: "unit" | "integration" | "snapshot";
  framework?: "vitest" | "jest" | "bun" | "pytest";
  coverageTarget?: number;
  existingTests?: string[];
}

interface TestResult {
  testFile: string;
  framework: string;
  cases: TestCase[];
  coverage: CoverageReport;
  status: "PASS" | "FAIL" | "PARTIAL";
}

interface TestCase {
  name: string;
  description: string;
  status: "PASS" | "FAIL" | "SKIP";
  duration?: number;
}

interface CoverageReport {
  lines: number;
  functions: number;
  branches: number;
  statements: number;
}
```

### 错误处理

| 错误类型 | 处理方式 |
|----------|----------|
| 框架未安装 | 提示安装命令，不自动安装 |
| 测试运行失败 | 收集错误信息，上报给 executor |
| 覆盖率不足 | 标记为 PARTIAL，建议补充测试 |
| 文件不存在 | 立即报告错误 |

### 测试策略

1. **自动检测优先**：自动识别项目测试框架
2. **增量测试**：只测试变更相关的代码
3. **覆盖率门禁**：核心代码覆盖率要求 100%
4. **快照更新**：需要用户确认才更新快照

## 实现注意事项

1. **遵循现有模式**：子代理格式与现有 agent 一致
2. **工具最小化**：只使用必要的工具
3. **并行安全**：测试文件生成可并行执行
4. **幂等性**：重复生成测试不会破坏现有测试

## 文件变更清单

| 操作 | 文件路径 |
|------|----------|
| 新建 | `plugins/ztl-coder/agents/subagent/test-writer.md` |
| 修改 | `plugins/ztl-coder/agents/subagent/executor.md` |
| 修改 | `plugins/ztl-coder/agents/subagent/implementer.md` |
| 修改 | `plugins/ztl-coder/agents/primary/ztl-coder-commander.md` |

## 待解决问题

1. 是否需要支持 Mock/Stub 自动生成？
2. 如何处理异步代码的测试？
3. 是否需要支持测试数据 Fixtures 生成？

## 批准检查清单

- [ ] 设计与现有架构一致
- [ ] 子代理职责单一
- [ ] 工作流集成清晰
- [ ] 错误处理完整
