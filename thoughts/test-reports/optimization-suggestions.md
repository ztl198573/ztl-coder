# ztl-coder 插件优化建议报告

**报告日期**: 2026-03-21
**基于测试**: 端到端产品开发测试

---

## 1. 插件功能改进建议

### 1.1 子代理协调优化

#### 现状
子代理之间的调用主要通过 commander 手动协调，部分代理（如 implementer, reviewer）以隐式方式工作。

#### 建议
```yaml
改进方向: 显式调用链追踪
实现方式:
  - 在 TaskCreate 中记录 agent_chain 字段
  - 添加 workflow_trace 工具追踪调用链
  - 在最终报告中展示代理协作图

预期效果:
  - 更清晰的责任划分
  - 便于问题定位
  - 支持工作流回放
```

### 1.2 MCP 工具集成增强

#### 现状
MCP 工具（ast-grep, pty-manager）在新建项目场景下未触发使用。

#### 建议
```yaml
改进方向: 智能工具推荐
实现方式:
  - 在代码编写后自动推荐 ast-grep-search 验证模式
  - 在服务启动时推荐 pty-spawn 管理进程
  - 添加 tool_recommendation 钩子

触发场景:
  - 新文件创建 > 5 个时: 推荐 ast-grep-search 检查一致性
  - package.json 存在时: 推荐 pty-spawn 启动服务
  - 测试文件创建时: 推荐 pty-spawn 运行测试
```

### 1.3 批量执行优化

#### 现状
planner 生成的批次计划支持并行，但实际执行时 commander 需要手动调度。

#### 建议
```yaml
改进方向: 自动批次执行
实现方式:
  - 添加 execute_batch 命令
  - 读取 plans/*.md 自动解析批次
  - 按依赖顺序自动调度 implementer

接口设计:
  /ztl-coder-execute --plan=2026-03-21-decryption-game-plan.md --batch=1
  /ztl-coder-execute --plan=xxx --all  # 执行所有批次
```

---

## 2. 工作流优化建议

### 2.1 状态机可视化

#### 现状
工作流状态机在文档中描述，但缺乏运行时可视化。

#### 建议
```yaml
改进方向: 实时状态追踪
实现方式:
  - 在 .claude/state/ 目录维护当前状态
  - 提供 /ztl-coder-status 命令查看进度
  - 生成 Mermaid 状态图

状态文件示例:
  .claude/state/workflow.json
  {
    "current_phase": "IMPLEMENT",
    "completed_phases": ["BRAINSTORM", "PLAN"],
    "pending_phases": ["REVIEW", "VERIFY"],
    "artifacts": {
      "design": "thoughts/shared/designs/xxx.md",
      "plan": "thoughts/shared/plans/xxx.md"
    }
  }
```

### 2.2 增量开发支持

#### 现状
每次会话可能丢失上下文，难以从上次进度继续。

#### 建议
```yaml
改进方向: 会话连续性增强
实现方式:
  - 自动生成 session_summary.md
  - 在会话开始时自动加载上次进度
  - 支持 /ztl-coder-continue 命令

会话摘要内容:
  - 上次完成的任务
  - 未完成的原因
  - 下一步建议
  - 关键决策记录
```

### 2.3 错误恢复机制

#### 现状
任务失败时需要手动恢复，缺乏自动重试和回滚机制。

#### 建议
```yaml
改进方向: 智能错误恢复
实现方式:
  - 记录每个操作的 inverse 操作
  - 失败时提供回滚选项
  - 支持从任意检查点恢复

恢复策略:
  - 轻微错误: 自动重试（最多 3 次）
  - 中等错误: 请求用户确认后重试
  - 严重错误: 回滚到上一个稳定状态
```

---

## 3. 新功能建议

### 3.1 模板库系统

#### 需求描述
常用项目类型（React App, Express API, CLI Tool）可以预置模板。

#### 功能设计
```yaml
功能名称: /ztl-coder-template
用途: 从模板快速创建项目

命令示例:
  /ztl-coder-template --type=react-app --name=my-app
  /ztl-coder-template --type=express-api --name=my-api
  /ztl-coder-template --type=cli-tool --name=my-cli

模板内容:
  - 预配置的项目结构
  - 标准的 ARCHITECTURE.md
  - 常用工具函数
  - 测试配置
```

### 3.2 代码质量门禁

#### 需求描述
在代码审查前自动检查质量指标。

#### 功能设计
```yaml
功能名称: /ztl-coder-gate
用途: 代码质量门禁检查

检查项:
  - 测试覆盖率 > 80%
  - TypeScript 严格模式无错误
  - 无 eslint 错误
  - 函数复杂度 < 10
  - 无安全漏洞

门禁级别:
  - soft: 警告但不阻止
  - hard: 不通过则阻止提交
```

### 3.3 变更影响分析

#### 需求描述
在修改代码前分析可能的影响范围。

#### 功能设计
```yaml
功能名称: /ztl-coder-impact
用途: 分析代码变更影响

分析维度:
  - 依赖图: 谁依赖了这个模块
  - 测试影响: 哪些测试需要更新
  - API 变更: 是否影响外部接口
  - 数据库: 是否需要迁移

输出格式:
  - 影响报告 (Markdown)
  - 可视化依赖图 (Mermaid)
  - 建议的测试清单
```

### 3.4 协作会话支持

#### 需求描述
支持多人协作开发同一项目。

#### 功能设计
```yaml
功能名称: /ztl-coder-collab
用途: 多人协作会话管理

功能:
  - 创建协作会话
  - 分配任务给不同开发者
  - 合并各分支的更改
  - 冲突检测和解决

命令:
  /ztl-coder-collab start --project=xb_game_app
  /ztl-coder-collab assign --task=1.1 --to=developer-a
  /ztl-coder-collab status
  /ztl-coder-collab merge
```

---

## 4. 用户体验优化

### 4.1 进度反馈增强

#### 现状
长时间操作时用户缺乏进度感知。

#### 建议
- 添加进度条显示
- 阶段完成时发送通知
- 显示预计剩余时间

### 4.2 交互式确认

#### 现状
关键决策直接执行，用户缺乏确认机会。

#### 建议
- 架构决策前询问确认
- 大规模重构前展示影响
- 提供撤销选项

### 4.3 文档生成增强

#### 现状
文档需要手动编写，格式不统一。

#### 建议
- 自动生成 API 文档（从代码注释）
- 自动生成 README.md
- 自动生成 CHANGELOG.md

---

## 5. 性能优化建议

### 5.1 缓存机制

```yaml
优化项: 分析结果缓存
实现:
  - 缓存 ast-grep 搜索结果
  - 缓存代码库结构分析
  - 增量更新缓存

预期收益:
  - 减少重复分析时间
  - 加快工作流启动速度
```

### 5.2 并行执行优化

```yaml
优化项: 智能任务调度
实现:
  - 分析任务依赖图
  - 自动识别可并行任务
  - 资源感知调度

预期收益:
  - 充分利用计算资源
  - 减少总执行时间
```

---

## 6. 优先级排序

| 建议项 | 优先级 | 实现难度 | 预期价值 |
|--------|--------|----------|----------|
| 会话连续性增强 | P0 | 中 | 高 |
| 批量执行优化 | P0 | 中 | 高 |
| 状态机可视化 | P1 | 低 | 中 |
| 模板库系统 | P1 | 低 | 高 |
| MCP 工具推荐 | P1 | 低 | 中 |
| 代码质量门禁 | P2 | 中 | 高 |
| 错误恢复机制 | P2 | 高 | 高 |
| 变更影响分析 | P3 | 高 | 中 |
| 协作会话支持 | P3 | 高 | 中 |

---

**报告生成时间**: 2026-03-21
