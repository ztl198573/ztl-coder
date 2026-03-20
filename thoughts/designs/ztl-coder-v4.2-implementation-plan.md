# ztl-coder v4.2 实施计划

**会话 ID:** OCTTO-2026-03-20-001
**日期:** 2026-03-20
**主题:** MCP 工具增强 + 工作流优化

---

## 一、项目概述

### 1.1 当前状态
- **版本:** 2.0.0
- **已有工具:** `look_at`, `artifact_search`, `load_ledger`
- **技术栈:** TypeScript + Bun + MCP SDK
- **架构:** 基于 MCP 的工具服务，使用 Zod 进行 schema 定义

### 1.2 目标
- **分支 A:** 增强 MCP 工具能力（AST 搜索、PTY 管理器、代码索引、Git 增强）
- **分支 C:** 优化工作流体验（并行执行、增量计划、工作流模板、进度可视化）

---

## 二、分支 A: MCP 工具增强

### 2.1 AST 搜索工具

#### 技术可行性: 高
- **成熟方案:** TypeScript Compiler API、Babel、SWC、Tree-sitter
- **推荐选择:** Tree-sitter（跨语言支持、性能优秀、增量解析）

#### 工作量评估: 3-5 天

| 任务 | 预计时间 | 复杂度 |
|------|---------|--------|
| Tree-sitter 集成 | 4h | 中 |
| 多语言 grammar 配置 | 2h | 低 |
| 查询 DSL 设计 | 4h | 高 |
| 工具实现 | 4h | 中 |
| 测试与文档 | 2h | 低 |

#### 架构设计

```
src/tools/ast-search/
├── index.ts              # 工具入口和 schema
├── parser.ts             # Tree-sitter 解析器封装
├── queries/
│   ├── typescript.ts     # TS/JS 查询模式
│   ├── python.ts         # Python 查询模式
│   └── go.ts             # Go 查询模式
└── types.ts              # 类型定义
```

#### 核心 API 设计

```typescript
// 工具输入
interface AstSearchInput {
  query: string;           // 查询表达式
  path?: string;           // 搜索路径（默认当前目录）
  type?: "function" | "class" | "interface" | "variable" | "all";
  language?: "ts" | "js" | "py" | "go" | "auto";
}

// 查询语法示例
// fn:*Handler        - 匹配所有 Handler 结尾的函数
// class:User*        - 匹配 User 开头的类
// interface:*Service - 匹配所有 Service 接口
```

#### 依赖项
```json
{
  "web-tree-sitter": "^0.22.0",
  "tree-sitter-typescript": "^0.21.0",
  "tree-sitter-python": "^0.21.0",
  "tree-sitter-go": "^0.21.0"
}
```

---

### 2.2 PTY 管理器

#### 技术可行性: 中
- **挑战:** Node.js PTY 支持有限，需要原生模块
- **方案:** node-pty + 会话持久化 + 状态恢复

#### 工作量评估: 5-7 天

| 任务 | 预计时间 | 复杂度 |
|------|---------|--------|
| node-pty 集成 | 4h | 高 |
| 会话管理器实现 | 6h | 高 |
| 状态序列化 | 4h | 中 |
| MCP 工具接口 | 3h | 中 |
| 清理和恢复机制 | 3h | 中 |
| 测试 | 4h | 中 |

#### 架构设计

```
src/tools/pty-manager/
├── index.ts              # 工具入口
├── session-manager.ts    # 会话生命周期管理
├── pty-process.ts        # PTY 进程封装
├── serializer.ts         # 会话状态序列化
└── types.ts              # 类型定义
```

#### 会话持久化策略
```
thoughts/sessions/
├── session-{id}.json     # 会话元数据
├── session-{id}.log      # 输出日志
└── session-{id}.env      # 环境变量快照
```

#### 核心 API

```typescript
interface PtyInput {
  action: "create" | "send" | "resize" | "list" | "kill";
  sessionId?: string;      // 会话 ID
  command?: string;        // 启动命令
  input?: string;          // 发送输入
  cols?: number;           // 终端宽度
  rows?: number;           // 终端高度
}
```

#### 风险与缓解
| 风险 | 缓解措施 |
|------|---------|
| 原生模块编译失败 | 提供 fallback 到简单 shell 执行 |
| 会话泄漏 | 自动清理过期会话（默认 30 分钟） |
| 内存占用 | 限制最大并发会话数（默认 5） |

---

### 2.3 代码索引工具

#### 技术可行性: 高
- **方案:** 基于 CTAGS 或自建轻量级索引
- **推荐:** 自建索引（更好的控制和跨语言支持）

#### 工作量评估: 4-6 天

| 任务 | 酉计时间 | 复杂度 |
|------|---------|--------|
| 索引器核心 | 4h | 中 |
| 符号提取器 | 4h | 中 |
| 索引存储 | 3h | 中 |
| 增量更新 | 4h | 高 |
| 工具实现 | 3h | 中 |
| 测试 | 2h | 低 |

#### 架构设计

```
src/tools/code-index/
├── index.ts              # 工具入口
├── indexer.ts            # 索引构建器
├── symbol-extractor.ts   # 符号提取
├── storage.ts            # 索引持久化
├── watcher.ts            # 文件监听（增量更新）
└── types.ts              # 类型定义
```

#### 索引数据结构

```typescript
interface SymbolIndex {
  symbols: Map<string, SymbolInfo[]>;
  files: Map<string, FileInfo>;
  lastUpdated: number;
}

interface SymbolInfo {
  name: string;
  type: "function" | "class" | "interface" | "variable" | "constant";
  file: string;
  line: number;
  column: number;
  signature?: string;
  documentation?: string;
}
```

#### 索引存储位置
```
.thoughts/cache/
├── symbols.idx           # 符号索引
├── files.idx             # 文件索引
└── metadata.json         # 元数据
```

---

### 2.4 Git 增强工具

#### 技术可行性: 高
- **方案:** 简单封装 git CLI 命令
- **已有基础:** 项目使用 git，熟悉命令行操作

#### 工作量评估: 2-3 天

| 任务 | 预计时间 | 复杂度 |
|------|---------|--------|
| Git 操作封装 | 3h | 低 |
| Diff 分析 | 3h | 中 |
| 分支管理 | 2h | 低 |
| 冲突检测 | 3h | 中 |
| 工具实现 | 2h | 低 |
| 测试 | 1h | 低 |

#### 架构设计

```
src/tools/git-enhanced/
├── index.ts              # 工具入口
├── operations.ts         # Git 操作封装
├── diff-analyzer.ts      # Diff 分析
├── branch-manager.ts     # 分支管理
└── types.ts              # 类型定义
```

#### 核心 API

```typescript
interface GitInput {
  action: "status" | "diff" | "branch" | "stash" | "conflict" | "history";
  options?: {
    branch?: string;
    file?: string;
    since?: string;
    until?: string;
  };
}
```

---

## 三、分支 C: 工作流优化

### 3.1 并行执行引擎

#### 技术可行性: 高
- **方案:** Promise.all + 任务调度器
- **挑战:** 资源竞争、错误隔离

#### 工作量评估: 3-4 天

| 任务 | 预计时间 | 复杂度 |
|------|---------|--------|
| 任务调度器 | 4h | 高 |
| 并发控制 | 3h | 中 |
| 错误处理 | 2h | 中 |
| 进度跟踪 | 2h | 中 |
| 测试 | 2h | 中 |

#### 架构设计

```
src/workflow/parallel/
├── scheduler.ts          # 任务调度器
├── executor.ts           # 并行执行器
├── progress-tracker.ts   # 进度跟踪
└── types.ts              # 类型定义
```

#### 核心 API

```typescript
interface ParallelConfig {
  maxConcurrency: number;  // 最大并发数（默认 4）
  timeout: number;         // 单任务超时（默认 30s）
  retryCount: number;      // 失败重试次数（默认 2）
}

async function executeParallel<T>(
  tasks: Task<T>[],
  config: ParallelConfig
): Promise<ParallelResult<T>>;
```

---

### 3.2 增量计划系统

#### 技术可行性: 高
- **方案:** 计划版本化 + 变更检测
- **已有基础:** 现有 plan 结构可扩展

#### 工作量评估: 2-3 天

| 任务 | 预计时间 | 复杂度 |
|------|---------|--------|
| 计划版本化 | 2h | 中 |
| 变更检测 | 3h | 高 |
| 差异生成 | 2h | 中 |
| 合并策略 | 3h | 高 |
| 测试 | 2h | 中 |

#### 架构设计

```
src/workflow/incremental/
├── plan-versioning.ts    # 计划版本管理
├── change-detector.ts    # 变更检测
├── differ.ts             # 差异生成
├── merger.ts             # 计划合并
└── types.ts              # 类型定义
```

#### 计划结构扩展

```typescript
interface VersionedPlan {
  id: string;
  version: number;
  parentVersion?: number;
  createdAt: Date;
  updatedAt: Date;
  tasks: Task[];
  checksum: string;       // 内容校验和
  diff?: PlanDiff;        // 与上一版本的差异
}
```

---

### 3.3 工作流模板系统

#### 技术可行性: 高
- **方案:** 模板文件 + 参数替换
- **简单直接:** Markdown 模板 + Mustache 风格变量

#### 工作量评估: 2 天

| 任务 | 预计时间 | 复杂度 |
|------|---------|--------|
| 模板解析器 | 2h | 低 |
| 参数系统 | 2h | 低 |
| 预置模板 | 3h | 低 |
| 模板管理 | 1h | 低 |
| 测试 | 1h | 低 |

#### 架构设计

```
src/workflow/templates/
├── index.ts              # 模板管理器
├── parser.ts             # 模板解析
├── resolver.ts           # 参数解析
└── presets/              # 预置模板
    ├── feature.md
    ├── bugfix.md
    ├── refactor.md
    └── release.md
```

#### 模板示例

```markdown
# {{feature_name}} 功能开发计划

## 背景
{{#context}}
{{.}}
{{/context}}

## 任务清单
{{#tasks}}
- [ ] {{description}} (预估: {{estimate}})
{{/tasks}}
```

---

### 3.4 进度可视化系统

#### 技术可行性: 高
- **方案:** Ledger 内嵌进度条 + 状态标记
- **输出格式:** Markdown + ASCII 进度条

#### 工作量评估: 2 天

| 任务 | 预计时间 | 复杂度 |
|------|---------|--------|
| 进度计算 | 2h | 低 |
| 可视化渲染 | 3h | 中 |
| Ledger 集成 | 2h | 中 |
| 状态持久化 | 1h | 低 |
| 测试 | 1h | 低 |

#### 架构设计

```
src/workflow/progress/
├── calculator.ts         # 进度计算
├── renderer.ts           # 可视化渲染
├── ledger-integration.ts # Ledger 集成
└── types.ts              # 类型定义
```

#### 可视化示例

```markdown
## 当前进度

### 整体进度
[████████░░░░░░░░░░░░] 40% (4/10 任务完成)

### 分阶段进度
| 阶段 | 状态 | 进度 |
|------|------|------|
| 设计 | 完成 | [████████████] 100% |
| 开发 | 进行中 | [████░░░░░░░░] 33% |
| 测试 | 待开始 | [░░░░░░░░░░░░] 0% |
| 部署 | 待开始 | [░░░░░░░░░░░░] 0% |

### 活动任务
- [x] 需求分析
- [x] 技术方案设计
- [x] API 接口定义
- [>] 代码实现 (当前)
- [ ] 单元测试
```

---

## 四、实施优先级

### 4.1 推荐实施顺序

```
阶段 1 (第 1 周): 基础增强
├── A.4 Git 增强工具     [2-3 天] ⭐ 低风险高价值
├── C.3 工作流模板       [2 天]   ⭐ 快速见效
└── C.4 进度可视化       [2 天]   ⭐ 用户体验提升

阶段 2 (第 2 周): 核心能力
├── A.1 AST 搜索         [3-5 天] ⭐⭐ 高价值核心功能
├── A.3 代码索引         [4-6 天] ⭐⭐ 需要与 AST 配合
└── C.1 并行执行         [3-4 天] ⭐ 性能提升

阶段 3 (第 3 周): 高级特性
├── C.2 增量计划         [2-3 天] ⭐ 工作流优化
└── A.2 PTY 管理器       [5-7 天] ⭐⭐ 高风险高回报
```

### 4.2 优先级矩阵

| 功能 | 价值 | 风险 | 工作量 | 优先级 |
|------|------|------|--------|--------|
| Git 增强 | 高 | 低 | 低 | P0 |
| 工作流模板 | 高 | 低 | 低 | P0 |
| 进度可视化 | 中 | 低 | 低 | P0 |
| AST 搜索 | 高 | 中 | 中 | P1 |
| 代码索引 | 高 | 中 | 中 | P1 |
| 并行执行 | 中 | 中 | 中 | P1 |
| 增量计划 | 中 | 低 | 低 | P2 |
| PTY 管理器 | 高 | 高 | 高 | P2 |

---

## 五、依赖关系图

```
                    ┌─────────────────┐
                    │   Git 增强 A.4   │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
    ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
    │ AST 搜索 A.1 │  │ 代码索引 A.3 │  │ 工作流模板   │
    └──────┬──────┘  └──────┬──────┘  │   C.3       │
           │                │         └──────┬──────┘
           └────────┬───────┘                │
                    ▼                        ▼
           ┌─────────────────┐      ┌─────────────┐
           │   并行执行 C.1   │      │ 进度可视化   │
           └────────┬────────┘      │   C.4       │
                    │               └──────┬──────┘
                    ▼                      │
           ┌─────────────────┐             │
           │  增量计划 C.2    │◄────────────┘
           └────────┬────────┘
                    │
                    ▼
           ┌─────────────────┐
           │  PTY 管理器 A.2  │
           └─────────────────┘
```

---

## 六、技术决策记录

### 6.1 AST 解析器选择

**决策:** 使用 Tree-sitter

**理由:**
1. 跨语言支持（内置 40+ 语言）
2. 增量解析能力
3. 错误容忍（即使语法错误也能解析）
4. 活跃的社区和维护

**替代方案:**
- TypeScript Compiler API: 仅支持 TS/JS
- Babel: 仅支持 JS 生态
- SWC: 仅支持 JS/TS，Rust 实现集成复杂

### 6.2 PTY 会话持久化

**决策:** JSON + 日志文件

**理由:**
1. 简单可读
2. 易于调试
3. 跨平台兼容

**替代方案:**
- SQLite: 过度设计
- 内存 only: 无法恢复

### 6.3 索引存储

**决策:** 文件系统 + JSON

**理由:**
1. 无需额外依赖
2. 便于版本控制
3. 易于清理

**替代方案:**
- SQLite: 需要额外依赖
- LevelDB: 原生模块编译问题

---

## 七、风险与缓解

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|---------|
| Tree-sitter 编译失败 | 中 | 高 | 提供预编译二进制 |
| node-pty 兼容性问题 | 高 | 中 | Fallback 到简单执行 |
| 索引性能问题 | 低 | 中 | 增量更新 + 缓存 |
| 并发资源竞争 | 中 | 中 | 信号量 + 超时 |
| 模板参数注入 | 低 | 低 | 参数白名单 |

---

## 八、测试策略

### 8.1 单元测试覆盖

- 每个工具独立测试
- Mock 文件系统操作
- Mock 外部进程调用

### 8.2 集成测试

- 工具链组合测试
- 端到端工作流测试
- 性能基准测试

### 8.3 测试覆盖率目标

- 核心工具: 100%
- 辅助函数: 80%
- 整体: 85%+

---

## 九、文档计划

### 9.1 用户文档

- [ ] 工具使用指南
- [ ] 工作流最佳实践
- [ ] 常见问题 FAQ

### 9.2 开发文档

- [ ] 架构设计说明
- [ ] API 参考
- [ ] 贡献指南

---

## 十、时间线

```
第 1 周 (Day 1-7)
├── Day 1-3: Git 增强 + 工作流模板
├── Day 4-5: 进度可视化
└── Day 6-7: 集成测试 + 文档

第 2 周 (Day 8-14)
├── Day 8-12: AST 搜索 + 代码索引
├── Day 13-14: 并行执行
└── Day 15: 集成测试

第 3 周 (Day 15-21)
├── Day 16-18: 增量计划
├── Day 19-21: PTY 管理器
└── Day 22: 最终测试 + 发布准备
```

---

## 十一、下一步行动

1. **立即开始:** 实现 Git 增强工具（低风险高价值）
2. **并行准备:** 工作流模板系统的预置模板
3. **技术预研:** Tree-sitter 在 Bun 环境下的集成测试
4. **环境准备:** 添加必要的依赖到 package.json

---

## 附录 A: 依赖更新

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "zod": "^3.23.0",
    "web-tree-sitter": "^0.22.0",
    "node-pty": "^1.0.0",
    "mustache": "^4.2.0",
    "chalk": "^5.3.0"
  },
  "devDependencies": {
    "@types/bun": "^1.1.0",
    "@types/node": "^20.11.0",
    "@types/mustache": "^4.2.0",
    "typescript": "^5.4.0"
  }
}
```

## 附录 B: 目录结构扩展

```
src/
├── tools/
│   ├── look-at.ts          # 现有
│   ├── artifact-search.ts  # 现有
│   ├── ledger-loader.ts    # 现有
│   ├── ast-search/         # 新增
│   ├── pty-manager/        # 新增
│   ├── code-index/         # 新增
│   └── git-enhanced/       # 新增
├── workflow/               # 新增
│   ├── parallel/
│   ├── incremental/
│   ├── templates/
│   └── progress/
└── utils/
    ├── config.ts
    ├── logger.ts
    └── errors.ts
```
