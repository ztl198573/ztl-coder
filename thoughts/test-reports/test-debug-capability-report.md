# ztl-coder v6.1.0 测试与调试能力添加报告

**日期**: 2026-03-21
**版本**: 6.1.0

---

## 新增功能

### 1. test-writer 子代理

**文件**: `plugins/ztl-coder/agents/subagent/test-writer.md`

**能力**:
- 多框架支持（Vitest、Jest、Bun Test、Pytest）
- 自动检测测试框架
- 单元测试、集成测试、快照测试
- 测试覆盖率分析
- TDD 流程支持

**触发时机**: 实现→测试→审查循环中的测试阶段

### 2. debugger 子代理

**文件**: `plugins/ztl-coder/agents/subagent/debugger.md`

**能力**:
- 证据驱动的根因分析
- 调用链可观测性增强
- 日志注入（入口/出口/数据变化）
- 5 Whys 分析法
- 鱼骨图分析
- 调试报告生成

**触发时机**: 测试失败时

**核心原则**:
- **无调查不修复**: 先收集证据再修改代码
- **证据驱动**: 每个结论必须有日志/数据支撑
- **最小侵入**: 日志添加应最小化代码改动

### 3. 调试技能

**文件**: `src/skills/debug-skill.md`

**包含**:
- 错误收集模板
- 调用链分析方法
- 日志注入模式
- 调试日志工具函数
- 常见问题模式处理

---

## 工作流更新

### 之前 (v6.0.0)
```
BRAINSTORM → PLAN → IMPLEMENT → TEST → REVIEW → VERIFY
```

### 现在 (v6.1.0)
```
BRAINSTORM → PLAN → IMPLEMENT → TEST → DEBUG* → REVIEW → VERIFY
                                      ↑
                               仅在测试失败时触发
```

### 状态机

```
测试阶段
    │
    ├─ 通过 ──────────────────► 继续审查
    │
    └─ 失败
         │
         ▼
    ┌─────────────┐
    │  debugger   │
    │ 增强可观测性 │
    │ 分析根因    │
    └──────┬──────┘
           │
           ▼
    ┌─────────────┐
    │ 补充测试    │
    │ 或修复代码  │
    │ (最多3次)   │
    └─────────────┘
```

---

## 日志工具示例

```typescript
// 调试日志工具
const DebugLog = {
  entry(fn: string, args: unknown) {
    if (process.env.DEBUG) {
      console.log(`[ENTRY] ${fn}`, JSON.stringify(args, null, 2));
    }
  },

  exit(fn: string, result: unknown) {
    if (process.env.DEBUG) {
      console.log(`[EXIT] ${fn}`, JSON.stringify(result, null, 2));
    }
  },

  data(label: string, before: unknown, after: unknown) {
    if (process.env.DEBUG) {
      const changed = JSON.stringify(before) !== JSON.stringify(after);
      console.log(`[DATA] ${label}`, { before, after, changed });
    }
  },

  error(fn: string, error: Error) {
    console.error(`[ERROR] ${fn}`, {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
};
```

---

## 文件变更清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `agents/subagent/test-writer.md` | 新建 | 测试编写子代理 |
| `agents/subagent/debugger.md` | 新建 | 调试子代理 |
| `src/skills/debug-skill.md` | 新建 | 调试技能 |
| `agents/subagent/executor.md` | 修改 | 集成 debugger 到测试失败流程 |
| `agents/primary/ztl-coder-commander.md` | 修改 | 添加 test-writer 和 debugger 到工作流 |
| `scripts/session-start.sh` | 修改 | 更新版本和子代理列表 |
| `plugin.json` | 修改 | 版本更新到 6.1.0 |
| `package.json` | 修改 | 版本更新到 6.1.0 |
| `src/utils/config.ts` | 修改 | 版本更新到 6.1.0 |

---

## 子代理完整列表 (v6.1.0)

| 子代理 | 用途 | 类型 |
|--------|------|------|
| planner | 创建实现计划 | 开发 |
| executor | 编排实现→测试→审查循环 | 开发 |
| implementer | 执行具体任务（TDD） | 开发 |
| **test-writer** | 编写单元/集成测试 | **测试** |
| **debugger** | 调试和根因分析 | **调试** |
| reviewer | 代码审查 | 质量 |
| e2e-tester | E2E 前端自动化测试 | 质量 |
| doc-manager | 文档管理 | 文档 |
| codebase-locator | 查找文件位置 | 搜索 |
| codebase-analyzer | 深度模块分析 | 分析 |
| pattern-finder | 查找现有模式 | 分析 |
| project-initializer | 初始化项目文档 | 初始化 |
| ledger-creator | 创建连续性账本 | 持久化 |
| artifact-searcher | 搜索历史工作 | 搜索 |

---

## TDD 工作流

```
1. Red 阶段
   └── test-writer 编写失败的测试
   └── 运行测试，确认失败

2. Green 阶段
   └── implementer 编写最小代码使测试通过
   └── 运行测试，确认通过

3. Refactor 阶段
   └── implementer 优化代码
   └── 每次改动后运行测试

4. 测试失败时
   └── debugger 增强可观测性
   └── 分析日志，定位根因
   └── 修复后重新测试
```

---

## 下一步

1. ✅ 插件已重新安装 (v6.1.0)
2. 🔜 在实际项目中验证测试和调试流程
3. 🔜 收集用户反馈，优化调试体验

---

**报告生成时间**: 2026-03-21
