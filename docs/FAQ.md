# ztl-coder 常见问题

**版本**: 1.0.0
**更新日期**: 2026-03-21

---

## 目录

1. [安装问题](#安装问题)
2. [使用问题](#使用问题)
3. [TDD 相关](#tdd-相关)
4. [调试相关](#调试相关)
5. [性能问题](#性能问题)
6. [配置问题](#配置问题)
7. [错误排查](#错误排查)

---

## 安装问题

### Q: 安装后插件没有加载？

**A**: 检查以下几点：

1. 确认插件已安装
```bash
claude plugins list
# 应该看到 ztl-coder@1.0.0
```

2. 重启 Claude Code
```bash
# 退出当前会话，重新启动
```

3. 检查 marketplace 配置
```bash
claude plugins marketplace list
# 确认 ztl-coder-local 或 gitee marketplace 存在
```

### Q: Plannotator 安装失败？

**A**:

**macOS/Linux**:
```bash
# 手动安装
curl -fsSL https://plannotator.ai/install.sh | bash

# 或使用 npm
npm install -g plannotator
```

**Windows**:
```powershell
# 以管理员身份运行 PowerShell
Set-ExecutionPolicy Bypass -Scope Process
irm https://plannotator.ai/install.ps1 | iex
```

### Q: 本地安装后命令找不到？

**A**: 确保 marketplace 路径正确：

```bash
# 添加绝对路径
claude plugins marketplace add /home/user/ztl-coder

# 而不是相对路径
# ❌ claude plugins marketplace add ./ztl-coder
```

---

## 使用问题

### Q: 如何选择主代理？

**A**: 根据任务类型选择：

| 任务类型 | 推荐代理 |
|----------|----------|
| 完整功能开发 | `/ztl-coder-commander` |
| 需求分析 | `/ztl-coder-brainstormer` |
| UI 设计 | `/ztl-coder-octto` |
| 简单修复 | 直接描述，不需要命令 |

### Q: 子代理什么时候被调用？

**A**: 子代理由主代理自动调度：

- **planner**: commander 确认设计后
- **implementer**: executor 分配任务时
- **test-writer**: 实现阶段（TDD）
- **debugger**: 测试失败时
- **reviewer**: 实现完成后

你不需要手动调用子代理。

### Q: 如何查看工作进度？

**A**:

1. 查看 TodoWrite 输出
2. 查看 `thoughts/` 目录下的文档
3. 查看 git 状态（如果在 worktree 中工作）

### Q: 任务卡住了怎么办？

**A**:

1. 检查是否有阻塞的子任务
2. 查看最近的错误信息
3. 尝试简化任务描述
4. 使用 `/ztl-coder-search` 查找历史上下文

---

## TDD 相关

### Q: 为什么必须先写测试？

**A**: ztl-coder 强制 TDD 流程，原因：

1. **确保可测试性** - 先写测试保证代码可测试
2. **明确需求** - 测试即文档
3. **防止回归** - 未来修改有保护
4. **提高质量** - 强制思考边界条件

### Q: 测试覆盖率不达标怎么办？

**A**:

1. 查看覆盖率报告
```bash
npx vitest run --coverage
```

2. 找出未覆盖的代码

3. 调用 test-writer 补充测试
```bash
/ztl-coder-commander 补充 xxx 模块的测试覆盖率
```

### Q: 测试失败时应该做什么？

**A**:

1. **不要手动猜测** - 让 debugger 分析
2. 查看调试日志
3. 基于证据定位问题
4. 修复后验证

```bash
# 正确做法
/ztl-coder-commander 测试失败，帮我调试

# 错误做法
# 直接修改代码，猜测原因
```

### Q: 如何跳过某些测试？

**A**:

ztl-coder **不允许跳过测试**。如果测试有问题：

1. 检查测试逻辑是否正确
2. 检查实现是否符合预期
3. 修复测试或实现，而不是跳过

---

## 调试相关

### Q: debugger 如何工作？

**A**:

1. **收集证据** - 错误堆栈、上下文
2. **分析调用链** - 从入口到错误点
3. **注入日志** - 在关键位置添加日志
4. **运行分析** - 查看数据流
5. **定位根因** - 基于证据推理
6. **生成报告** - `thoughts/debug-reports/`

### Q: 调试日志太多怎么办？

**A**:

1. 使用环境变量控制
```bash
DEBUG=true npm run test  # 启用
npm run test             # 禁用
```

2. 日志会自动添加条件判断
```typescript
if (process.env.DEBUG) {
  console.log('[DEBUG] ...');
}
```

3. 修复后，debugger 会清理不必要的日志

### Q: 如何手动添加调试日志？

**A**:

使用 DebugLog 工具：

```typescript
import { DebugLog } from '@/utils/debug';

function myFunction(input: string) {
  DebugLog.entry('myFunction', { input });

  const result = process(input);
  DebugLog.data('process', input, result);

  DebugLog.exit('myFunction', result);
  return result;
}
```

---

## 性能问题

### Q: 工作流执行太慢？

**A**:

1. **简化任务描述** - 一次只做一件事
2. **减少并行任务** - 默认最多 10 个并行
3. **使用 look_at** - 减少 Read 工具调用
4. **复用账本** - 恢复上下文而不是重新分析

### Q: 上下文太长？

**A**:

1. 使用 `/compact` 压缩
2. 使用 `ztl_code_look_at` 代替完整读取
3. 创建账本保存进度，然后开始新会话

### Q: 内存占用过高？

**A**:

1. 减少并行子代理数量
```json
{
  "maxParallelAgents": 5
}
```

2. 定期清理旧的工件
```bash
/ztl-coder-doc cleanup
```

---

## 配置问题

### Q: 如何自定义覆盖率阈值？

**A**:

创建 `ztl_coder.json`:

```json
{
  "coverage": {
    "core": { "lines": 100, "functions": 100, "branches": 95 },
    "utils": { "lines": 85, "functions": 85, "branches": 75 },
    "components": { "lines": 70, "functions": 70, "branches": 60 }
  }
}
```

### Q: 如何禁用某些功能？

**A**:

```json
{
  "features": {
    "tddEnforcement": false,    // 禁用 TDD 强制
    "coverageGates": false,     // 禁用覆盖率门禁
    "debugOnFailure": false,    // 禁用自动调试
    "visualPlanReview": false   // 禁用可视化计划审查
  }
}
```

### Q: 如何调整代理温度？

**A**:

```json
{
  "agents": {
    "commander": { "temperature": 0.1 },  // 更精确
    "brainstormer": { "temperature": 0.9 } // 更创意
  }
}
```

---

## 错误排查

### Q: "Agent not found" 错误？

**A**:

1. 检查插件是否正确安装
2. 检查代理名称拼写
3. 重启 Claude Code

### Q: "Test framework not detected" 错误？

**A**:

1. 确保测试框架已安装
```bash
npm install -D vitest
# 或
npm install -D jest
```

2. 确保配置文件存在
```bash
# Vitest
vitest.config.ts

# Jest
jest.config.js
```

### Q: "Worktree creation failed" 错误？

**A**:

1. 确保是 git 仓库
```bash
git init
```

2. 确保有初始提交
```bash
git add .
git commit -m "Initial commit"
```

3. 检查 git 状态
```bash
git status
```

### Q: "MCP tool timeout" 错误？

**A**:

1. 增加超时时间
```json
{
  "mcp": {
    "timeout": 60000
  }
}
```

2. 检查网络连接
3. 检查进程是否卡死

### Q: 日志显示乱码？

**A**:

1. 检查终端编码设置
```bash
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8
```

2. 检查文件编码
```bash
file -i your-file.ts
```

---

## 其他问题

### Q: 支持哪些编程语言？

**A**:

| 语言 | 支持程度 |
|------|----------|
| TypeScript/JavaScript | ✅ 完全支持 |
| Python | ✅ 完全支持 |
| Go | ⚠️ 部分支持 |
| Rust | ⚠️ 部分支持 |
| Java | ⚠️ 部分支持 |
| C/C++ | ⚠️ 基础支持 |

### Q: 支持哪些测试框架？

**A**:

| 框架 | 支持程度 |
|------|----------|
| Vitest | ✅ 完全支持 |
| Jest | ✅ 完全支持 |
| Bun Test | ✅ 完全支持 |
| Pytest | ✅ 完全支持 |
| Mocha | ⚠️ 部分支持 |

### Q: 如何贡献代码？

**A**:

1. Fork 仓库
2. 创建功能分支
3. 提交 Pull Request
4. 等待审查

### Q: 如何报告 Bug？

**A**:

1. 收集错误信息
2. 描述复现步骤
3. 提供环境信息
4. 提交 Issue

**Issue 模板**:

```markdown
## 问题描述
[简要描述问题]

## 复现步骤
1. ...
2. ...
3. ...

## 期望行为
[应该发生什么]

## 实际行为
[实际发生了什么]

## 环境信息
- ztl-coder 版本:
- Claude Code 版本:
- Node.js 版本:
- 操作系统:

## 附加信息
[日志、截图等]
```

---

## 获取更多帮助

- **GitHub**: https://github.com/ztl/ztl-coder
- **Gitee**: https://gitee.com/ass2in/ztl-coder
- **文档**: [用户手册](./USER_MANUAL.md)
