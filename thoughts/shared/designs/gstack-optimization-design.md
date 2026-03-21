# GStack 优化设计方案

**日期**: 2026-03-21
**状态**: 草案
**作者**: Octto (交互式设计引导者)

---

## 1. 项目对比分析

### 1.1 GStack 核心设计理念

GStack 是一个高度优化的 AI 工作流引擎，其核心设计理念包括:

#### 1.1.1 守护进程模型 (Daemon Model)
- **持久化浏览器**: Chromium 以守护进程方式运行，首次启动约 3 秒，后续命令仅需 100-200ms
- **状态持久化**: Cookies、登录会话、标签页在命令间保持
- **自动生命周期**: 首次使用自动启动，30 分钟空闲后自动关闭
- **版本自动重启**: 检测到版本变更时自动重启服务器

#### 1.1.2 Skill 系统
- **声明式定义**: 通过 YAML frontmatter + Markdown 定义技能
- **Preamble 模式**: 每个 Skill 执行前运行统一的预置脚本（更新检查、会话跟踪、遥测）
- **模板生成**: SKILL.md 从 `.tmpl` 文件自动生成，包含代码元数据
- **分层测试**: 静态验证（免费）-> E2E 测试（付费）-> LLM 评估

#### 1.1.3 命令注册表
```typescript
// commands.ts - 单一事实来源
export const READ_COMMANDS = new Set(['text', 'html', 'links', ...]);
export const WRITE_COMMANDS = new Set(['goto', 'click', 'fill', ...]);
export const META_COMMANDS = new Set(['tabs', 'screenshot', ...]);
```

#### 1.1.4 Ref 系统
- 通过 ARIA 树自动分配 `@e1`, `@e2` 引用
- 使用 Playwright Locator 而非 DOM 修改
- 导航时自动失效，强制重新获取快照

#### 1.1.5 错误哲学
- **面向 AI 代理**: 每个错误消息必须可操作
- **快速失败**: Chromium 崩溃直接退出进程，不尝试自愈
- **可操作的指导**: "元素未找到 → 运行 `snapshot -i` 查看可用元素"

### 1.2 ztl-coder 当前架构

#### 1.2.1 MCP 服务器模式
- 使用 `@modelcontextprotocol/sdk` 构建
- 提供 `look_at`, `artifact_search`, `load_ledger` 工具
- 基于 Zod 的 schema 验证

#### 1.2.2 工具系统
```
src/tools/
├── look-at.ts           # 文件结构提取
├── artifact-search.ts   # 历史工件搜索
├── ledger-loader.ts     # 会话账本加载
├── git-enhanced/        # Git 增强工具
├── ast-search/          # AST 搜索
├── pty-manager/         # PTY 管理
├── code-index/          # 代码索引
└── e2e-testing/         # E2E 测试
```

#### 1.2.3 工作流系统
```
src/workflow/
├── templates/           # 工作流模板 (feature/bugfix/refactor)
├── parallel/            # 并行执行器
└── incremental/         # 增量构建管理
```

---

## 2. 可借鉴的设计模式

### 2.1 高优先级: 守护进程模式

**问题**: ztl-coder 的工具每次调用都是独立的，没有持久化状态

**借鉴方案**:
```
当前模式:
  用户调用工具 → 启动进程 → 执行 → 返回结果 → 进程结束

守护进程模式:
  首次调用 → 启动守护进程 → 执行 → 保持运行
  后续调用 → 连接守护进程 → 执行 → 返回结果（100ms 级别）
```

**应用场景**:
- `code-index`: 代码索引可以持久化在内存中
- `ast-search`: AST 解析结果可以缓存
- `e2e-testing`: 浏览器会话可以复用

### 2.2 高优先级: Skill 系统

**问题**: ztl-coder 缺乏声明式的技能/代理定义系统

**借鉴方案**:
```yaml
---
name: code-review
description: 代码审查技能，分析代码质量并提出改进建议
allowed-tools:
  - Read
  - Grep
  - Bash
---

## Preamble (执行前)

## 审查流程
...

## Telemetry (执行后)
```

**优势**:
- 统一的代理定义格式
- 自动生成文档
- 可测试性
- 遥测和分析

### 2.3 高优先级: 命令注册表模式

**问题**: 工具定义分散，缺乏统一管理

**借鉴方案**:
```typescript
// src/tools/registry.ts
export const READ_TOOLS = new Set(['look_at', 'artifact_search', 'load_ledger']);
export const WRITE_TOOLS = new Set(['smart_commit', 'conflict_resolver']);
export const META_TOOLS = new Set(['status', 'health_check']);

export const TOOL_DESCRIPTIONS: Record<string, ToolMeta> = {
  'look_at': {
    category: 'Reading',
    description: '提取文件结构，节省上下文',
    usage: 'look_at <file_path> [--extract structure|imports|exports|all]'
  },
  // ...
};
```

**优势**:
- 单一事实来源
- 自动文档生成
- 类型安全
- 运行时验证

### 2.4 中优先级: Preamble/Telemetry 模式

**问题**: 缺乏统一的生命周期钩子

**借鉴方案**:
```bash
# Preamble - 每个 Skill 执行前
_CHECK_UPDATE=$(ztl-update-check 2>/dev/null || true)
_START_TIME=$(date +%s)
_SESSION_ID="$$-$(date +%s)"
mkdir -p ~/.ztl/sessions
touch ~/.ztl/sessions/"$PPID"

# ... 执行 Skill 逻辑 ...

# Telemetry - 扥行后
_END_TIME=$(date +%s)
_DURATION=$(( _END_TIME - _START_TIME ))
ztl-telemetry-log --skill "SKILL_NAME" --duration "$_DURATION" --outcome "OUTCOME"
```

**优势**:
- 自动遥测
- 版本检查
- 会话跟踪
- 用户行为分析

### 2.5 中优先级: Ref 系统

**问题**: AST 搜索结果难以在后续操作中引用

**借鉴方案**:
```
当前: AST 搜索返回文本结果
改进: AST 搜索返回可引用的节点 ID

@n1 [function] "createUser" at src/user.ts:15
@n2 [class] "UserService" at src/user.ts:45
@n3 [interface] "User" at src/types.ts:10

后续操作:
refactor @n1 --extract-function
rename @n2 --to "AccountService"
```

### 2.6 低优先级: 错误哲学

**问题**: 错误消息面向开发者，不够友好

**借鉴方案**:
```
当前: "Error: ENOENT: no such file or directory"
改进: "文件未找到: path/to/file。请检查路径是否正确，或使用 look_at 查看目录结构。"
```

---

## 3. 具体优化建议

### 3.1 Phase 1: 架构重构 (高优先级)

#### 3.1.1 创建 Skill 系统

**目标**: 实现声明式的代理/技能定义

**实现路径**:
1. 创建 `.agents/skills/` 目录结构
2. 定义 SKILL.md 格式规范
3. 实现 Skill 加载器
4. 创建模板生成脚本

**目录结构**:
```
.agents/skills/
├── ztl-code-review/
│   └── SKILL.md
├── ztl-refactor/
│   └── SKILL.md
├── ztl-debug/
│   └── SKILL.md
└── ztl-ship/
    └── SKILL.md
```

#### 3.1.2 实现命令注册表

**目标**: 统一工具定义和管理

**实现路径**:
1. 创建 `src/tools/registry.ts`
2. 迁移现有工具定义
3. 实现自动文档生成
4. 添加运行时验证

### 3.2 Phase 2: 性能优化 (中优先级)

#### 3.2.1 守护进程模式

**目标**: 减少工具调用延迟

**实现路径**:
1. 创建 `src/daemon/` 模块
2. 实现状态文件管理（类似 `.gstack/browse.json`）
3. 添加健康检查机制
4. 实现自动重启逻辑

**应用场景**:
- 代码索引守护进程
- AST 缓存守护进程
- 浏览器会话守护进程

#### 3.2.2 Ref 系统

**目标**: 使搜索结果可引用

**实现路径**:
1. 扩展 AST 搜索返回格式
2. 创建 Ref 解析器
3. 实现 Ref 持久化
4. 添加失效检测

### 3.3 Phase 3: 用户体验 (低优先级)

#### 3.3.1 Preamble/Telemetry

**目标**: 统一生命周期管理

**实现路径**:
1. 创建 `src/hooks/preamble.ts`
2. 创建 `src/hooks/telemetry.ts`
3. 集成到 Skill 系统
4. 添加分析仪表板

#### 3.3.2 错误消息优化

**目标**: 提供可操作的错误指导

**实现路径**:
1. 定义错误消息规范
2. 创建错误消息模板
3. 重构现有错误处理
4. 添加错误恢复建议

---

## 4. 实现计划

### 4.1 第一阶段 (1-2 周)

**目标**: 建立 Skill 系统基础

| 任务 | 优先级 | 预计时间 |
|------|--------|----------|
| 创建 Skill 目录结构 | P0 | 2 小时 |
| 定义 SKILL.md 格式 | P0 | 4 小时 |
| 实现 Skill 加载器 | P0 | 8 小时 |
| 迁移现有代理到 Skill | P1 | 4 小时 |
| 创建命令注册表 | P1 | 6 小时 |

### 4.2 第二阶段 (2-3 周)

**目标**: 性能优化

| 任务 | 优先级 | 预计时间 |
|------|--------|----------|
| 设计守护进程架构 | P0 | 4 小时 |
| 实现代码索引守护进程 | P1 | 12 小时 |
| 实现 AST 缓存守护进程 | P1 | 8 小时 |
| 实现 Ref 系统 | P2 | 8 小时 |

### 4.3 第三阶段 (1 周)

**目标**: 用户体验改进

| 任务 | 优先级 | 预计时间 |
|------|--------|----------|
| 实现 Preamble/Telemetry | P2 | 6 小时 |
| 优化错误消息 | P2 | 4 小时 |
| 创建遥测仪表板 | P3 | 8 小时 |

---

## 5. 待决策问题

### 5.1 Skill 系统设计

**问题 1**: Skill 定义应该放在项目根目录还是全局配置？

- **选项 A**: 项目级别（`.agents/skills/`）
  - 优点: 项目特定，版本控制
  - 缺点: 需要每个项目配置

- **选项 B**: 全局级别（`~/.ztl/skills/`）
  - 优点: 一次配置，到处使用
  - 缺点: 难以版本控制

- **选项 C**: 混合模式
  - 优点: 兼顾两者
  - 缺点: 复杂性增加

**推荐**: 选项 C - 混合模式，全局提供基础技能，项目可覆盖或扩展

---

**问题 2**: 是否需要实现完整的遥测系统？

- **选项 A**: 完整实现（类似 GStack）
  - 优点: 丰富的使用数据，帮助改进
  - 缺点: 隐私考虑，需要用户同意

- **选项 B**: 本地遥测（仅存储在本地）
  - 优点: 无隐私问题
  - 缺点: 无法跨设备同步

- **选项 C**: 不实现
  - 优点: 简单
  - 缺点: 缺乏使用洞察

**推荐**: 选项 B - 本地遥测，用户可选择是否启用

---

**问题 3**: 守护进程应该使用什么通信协议？

- **选项 A**: HTTP（类似 GStack）
  - 优点: 调试友好，跨语言
  - 缺点: 需要端口管理

- **选项 B**: Unix Socket
  - 优点: 性能更好，无端口冲突
  - 缺点: Windows 兼容性

- **选项 C**: JSON-RPC over Stdio
  - 优点: 简单，与 MCP 兼容
  - 缺点: 需要 stdio 多路复用

**推荐**: 选项 B - Unix Socket（Linux/macOS），Named Pipe（Windows）

---

## 6. 风险评估

| 风险 | 影响 | 可能性 | 缓解措施 |
|------|------|--------|----------|
| Skill 系统学习曲线 | 中 | 高 | 提供详细文档和示例 |
| 守护进程稳定性 | 高 | 中 | 实现健康检查和自动重启 |
| 遥测隐私问题 | 高 | 低 | 默认禁用，明确告知 |
| 向后兼容性 | 中 | 中 | 保持现有 API 不变 |

---

## 7. 成功指标

### 7.1 性能指标
- 工具调用延迟: 目标 < 200ms（当前 ~1-2s）
- 内存占用: 守护进程 < 100MB
- 启动时间: 守护进程 < 3s

### 7.2 用户体验指标
- Skill 定义简洁性: 单个 Skill < 100 行 Markdown
- 错误可操作性: 90%+ 错误包含恢复建议
- 文档覆盖率: 100% 工具有文档

### 7.3 开发效率指标
- 新 Skill 创建时间: < 30 分钟
- 测试覆盖率: > 80%
- CI/CD 时间: < 5 分钟

---

## 8. 下一步行动

1. **立即行动**: 审阅此设计文档，确认优先级
2. **本周**: 开始 Phase 1 - 创建 Skill 系统基础
3. **下周**: 实现命令注册表
4. **两周后**: 开始性能优化工作

---

## 附录 A: GStack 关键代码参考

### A.1 命令注册表
位置: `/home/ztl/DATA/demo/gstack/browse/src/commands.ts`

### A.2 浏览器管理器
位置: `/home/ztl/DATA/demo/gstack/browse/src/browser-manager.ts`

### A.3 Skill 示例
- QA Skill: `/home/ztl/DATA/demo/gstack/.agents/skills/gstack-qa/SKILL.md`
- Ship Skill: `/home/ztl/DATA/demo/gstack/.agents/skills/gstack-ship/SKILL.md`

---

## 附录 B: ztl-coder 当前结构

```
ztl-coder/
├── src/
│   ├── index.ts              # MCP 服务器入口
│   ├── tools/                # 工具定义
│   ├── utils/                # 工具函数
│   └── workflow/             # 工作流系统
├── thoughts/                 # 持久化工件
│   ├── ledgers/              # 会话账本
│   └── shared/               # 共享资源
│       ├── designs/          # 设计文档
│       └── plans/            # 计划文档
└── CLAUDE.md                 # 项目规则
```

---

**请回复 "批准" 或 "退出计划模式" 来触发 Plannotator 可视化审查。**
