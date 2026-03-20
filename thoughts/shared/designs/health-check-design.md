# ztl_coder 健康检查功能设计

**会话 ID:** health-check-2026-03-20
**日期:** 2026-03-20
**主题:** 为 ztl_coder 插件添加健康检查命令

## 1. 功能概述

### 1.1 目标
提供一个 `/ztl-coder-health` 命令，用于快速诊断插件运行状态，帮助用户排查问题。

### 1.2 检查项目
命令将检查以下组件的状态:

| 检查项 | 描述 | 重要性 |
|--------|------|--------|
| 插件元数据 | 验证 plugin.json 配置完整性 | 高 |
| MCP 服务连接 | 检查 MCP 服务器是否正常运行 | 高 |
| Hooks 配置 | 验证 hooks.json 语法和脚本存在性 | 中 |
| 目录结构 | 检查 thoughts/ 目录是否存在且可写 | 中 |
| 工具可用性 | 验证核心工具 (look_at, artifact_search 等) | 高 |
| 依赖状态 | 检查关键依赖是否安装 | 中 |

## 2. 探索路径

### 路径 A: 纯命令文件方式 (推荐)

**方案描述:**
- 创建 `commands/ztl-coder-health.md` 命令文件
- 使用 Bash 工具执行检查脚本
- 输出结构化的健康报告

**优点:**
- 实现简单，无需修改 MCP 服务器
- 易于维护和扩展
- 遵循现有插件架构

**缺点:**
- 无法进行深度的 MCP 服务健康检查
- 依赖外部命令执行

**用户选择:** 待定

---

### 路径 B: MCP 工具方式

**方案描述:**
- 在 MCP 服务器中添加 `health_check` 工具
- 通过工具调用返回详细状态
- 命令文件调用该工具

**优点:**
- 可以进行深度 MCP 服务检查
- 返回结构化数据
- 可被其他工具集成

**缺点:**
- 需要修改 MCP 服务器代码
- 增加代码复杂度

**用户选择:** 待定

---

### 路径 C: 混合方式

**方案描述:**
- 创建基础命令文件用于快速检查
- 可选添加 MCP 工具用于深度检查
- 支持参数控制检查深度

**优点:**
- 灵活性最高
- 满足不同使用场景

**缺点:**
- 实现复杂度较高
- 需要维护两套逻辑

**用户选择:** 待定

---

## 3. 推荐设计 (路径 A)

### 3.1 命令文件结构

```markdown
---
description: 检查 ztl_coder 插件健康状态
allowed-tools: Bash, Read, Glob
---

## 上下文
你正在检查 ztl_coder 插件的健康状态。

## 检查项目
1. 插件元数据检查
2. MCP 服务连接检查
3. Hooks 配置检查
4. 目录结构检查
5. 工具可用性检查

## 输出格式
[OK]/[WARN]/[ERROR] 检查项名称 - 详情
```

### 3.2 检查逻辑

#### 3.2.1 插件元数据检查
```bash
# 检查 plugin.json 存在性和关键字段
cat plugins/ztl-coder/.claude-plugin/plugin.json | jq '.name, .version'
```

#### 3.2.2 MCP 服务连接检查
```bash
# 检查 MCP 进程是否运行
pgrep -f "ztl-coder" || echo "MCP 服务未运行"
```

#### 3.2.3 Hooks 配置检查
```bash
# 验证 hooks.json 语法
jq . plugins/ztl-coder/hooks/hooks.json > /dev/null && echo "语法正确"
# 检查脚本是否存在
```

#### 3.2.4 目录结构检查
```bash
# 检查 thoughts 目录
[ -d "thoughts/ledgers" ] && echo "ledgers 目录存在"
[ -d "thoughts/shared" ] && echo "shared 目录存在"
[ -w "thoughts" ] && echo "thoughts 目录可写"
```

#### 3.2.5 工具可用性检查
```bash
# 检查工具文件是否存在
ls -la src/tools/index.ts
```

### 3.3 输出示例

```
=== ztl_coder 健康检查报告 ===
时间: 2026-03-20 10:30:00

[OK] 插件元数据 - ztl-coder v4.5.0
[OK] MCP 服务 - 服务运行中 (PID: 12345)
[WARN] Hooks 配置 - 脚本 plannotator-hook.sh 需要 plannotator
[OK] 目录结构 - thoughts/ 目录正常
[OK] 工具可用性 - 3/3 工具可用

总体状态: 健康 (4/5 检查通过)
```

## 4. 实现计划

### Phase 1: 基础命令 (Day 1)
- [ ] 创建 `commands/ztl-coder-health.md`
- [ ] 实现基础检查逻辑
- [ ] 添加输出格式化

### Phase 2: 增强检查 (Day 2)
- [ ] 添加 MCP 服务深度检查
- [ ] 添加依赖版本检查
- [ ] 添加性能指标

### Phase 3: 可选扩展 (Day 3)
- [ ] 支持检查深度参数
- [ ] 添加 JSON 输出格式
- [ ] 集成到 CI/CD

## 5. 文件清单

| 文件路径 | 操作 | 描述 |
|----------|------|------|
| `plugins/ztl-coder/commands/ztl-coder-health.md` | 新建 | 健康检查命令文件 |

## 6. 风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 检查命令执行失败 | 中 | 使用 try-catch 包装，提供降级输出 |
| 进程检查不准确 | 低 | 使用多种方法验证 |
| 权限问题 | 低 | 在命令中说明所需权限 |

## 7. 下一步行动

1. **确认设计方向** - 选择路径 A/B/C
2. **实现基础命令** - 创建命令文件
3. **测试验证** - 运行健康检查
4. **文档更新** - 更新 README

## 8. 待决策问题

请通过 Plannotator 标注提供反馈:

- [ ] 选择哪个实现路径? (推荐 A)
- [ ] 是否需要 JSON 输出格式?
- [ ] 检查深度级别? (basic/standard/deep)
- [ ] 是否需要自动修复功能?
