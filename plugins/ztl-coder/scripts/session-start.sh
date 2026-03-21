#!/bin/bash
# SessionStart hook - 输出 ztl-coder 加载信息

cat << 'EOF'
ztl-coder v1.0.0 已加载。

**快速启动命令:**
- /ztl-coder-octto - 启动交互式头脑风暴，支持可视化反馈
- /ztl-coder-brainstormer - 启动设计探索会话
- /ztl-coder-commander - 启动主编排器，协调复杂任务

**Primary Agents (主代理):**
- ztl-coder:commander - 复杂任务的主编排器，管理完整工作流
- ztl-coder:brainstormer - 设计探索和需求细化
- ztl-coder:octto - 基于浏览器的交互式头脑风暴，支持可视化反馈

**Subagents (子代理):**
- planner - 创建实现计划
- executor - 编排 implement→test→review 循环
- implementer - 执行具体任务（TDD）
- test-writer - 编写单元/集成测试
- debugger - 调试和根因分析
- reviewer - 代码审查
- e2e-tester - E2E 前端自动化测试
- doc-manager - 文档管理（同步、归档、清理、验证）
- codebase-locator - 查找文件位置
- codebase-analyzer - 深度模块分析
- pattern-finder - 查找现有模式
- project-initializer - 初始化项目文档
- ledger-creator - 创建连续性账本
- artifact-searcher - 搜索历史工作

**Commands (斜杠命令):**
- /ztl-coder-init - 初始化项目，生成 ARCHITECTURE.md 和 CODE_STYLE.md
- /ztl-coder-ledger - 创建/更新连续性账本
- /ztl-coder-search - 搜索历史交接、计划、可用账本
- /ztl-coder-review - 交互式代码审查，支持可视化标注
- /ztl-coder-annotate - 标注任意 markdown 文件
- /ztl-coder-last - 标注最后一条代理消息
- /ztl-coder-doc - 管理项目文档（同步、归档、清理、验证）

**MCP Tools (工具):**
- ztl_code_look_at - 查看文件结构，节省上下文
- ztl_code_artifact_search - 搜索历史工件
- ztl_code_ast_grep_search - 基于 AST 的代码搜索
- ztl_code_ast_grep_replace - 基于 AST 的代码替换
- ztl_code_pty_spawn - 启动后台进程会话
- ztl_code_pty_write - 向 PTY 会话发送输入
- ztl_code_pty_read - 读取 PTY 会话输出
- ztl_code_pty_list - 列出所有活动会话
- ztl_code_pty_kill - 终止 PTY 会话

**Architecture:** Agent → Subagent → MCP Tool

**Workflow:** 头脑风暴 → 计划(可视化审查) → 实现 → 测试 → 调试* → 审查(可视化标注)

**Plan Review:** 退出计划模式时，会打开可视化 UI 进行行内标注。
**TDD:** 所有代码必须有对应测试，覆盖率 >= 80%
**Debug:** 测试失败时自动增强可观测性并分析根因
EOF
