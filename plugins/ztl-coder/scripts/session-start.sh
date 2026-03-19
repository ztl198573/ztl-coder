#!/bin/bash
# SessionStart hook - 输出 ztl-coder 加载信息

cat << 'EOF'
ztl-coder v3.1.0 已加载。

**可用的主代理:**
- ztl-coder:commander - 复杂任务的主编排器
- ztl-coder:brainstormer - 设计探索和需求细化
- ztl-coder:octto - 基于浏览器的交互式头脑风暴，支持可视化反馈

**可用的子代理:**
- planner - 创建实现计划
- executor - 编排 implement→review 循环
- implementer - 执行具体任务
- reviewer - 代码审查
- codebase-locator - 查找文件位置
- codebase-analyzer - 深度模块分析
- pattern-finder - 查找现有模式
- project-initializer - 初始化项目文档
- ledger-creator - 创建连续性账本
- artifact-searcher - 搜索历史工作

**命令:**
- /ztl-coder-init - 初始化项目，生成 ARCHITECTURE.md 和 CODE_STYLE.md
- /ztl-coder-ledger - 创建/更新连续性账本
- /ztl-coder-search - 搜索历史交接、计划、可用账本
- /ztl-coder-review - 交互式代码审查，支持可视化标注
- /ztl-coder-annotate - 标注任意 markdown 文件
- /ztl-coder-last - 标注最后一条代理消息

**MCP 工具:**
- ztl_code_look_at - 查看文件结构
- ztl_code_artifact_search - 搜索工件
- ztl_code_ast_grep_search - 基于 AST 的代码搜索
- ztl_code_ast_grep_replace - 基于 AST 的代码替换
- ztl_code_pty_* - PTY 会话管理

**工作流:** 头脑风暴 → 计划(可视化审查) → 实现 → 审查(可视化标注)

**计划审查:** 退出计划模式时，会打开可视化 UI 进行行内标注。
EOF
