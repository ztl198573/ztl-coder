/**
 * ztl-coder MCP 服务器入口
 * 提供 look_at、artifact_search、load_ledger、ast_grep_*、pty_* 工具
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { PLUGIN_META } from "./utils/config";
import { log } from "./utils/logger";
import {
  lookAtSchema,
  executeLookAt,
  artifactSearchSchema,
  executeArtifactSearch,
  loadLedgerSchema,
  executeLoadLedger,
  astGrepSearchSchema,
  executeAstGrepSearch,
  astGrepReplaceSchema,
  executeAstGrepReplace,
  ptySpawnSchema,
  executePtySpawn,
  ptyWriteSchema,
  executePtyWrite,
  ptyReadSchema,
  executePtyRead,
  ptyListSchema,
  executePtyList,
  ptyKillSchema,
  executePtyKill,
} from "./tools";

/** 创建 MCP 服务器 */
const server = new McpServer({
  name: PLUGIN_META.name,
  version: PLUGIN_META.version,
});

// ============================================
// 注册基础工具
// ============================================

/** 注册 look_at 工具 */
server.tool(
  "look_at",
  "提取文件结构，节省上下文。用于大型文件或获取文件概览。",
  lookAtSchema,
  async (args) => {
    log.info(`查看文件: ${args.filePath}`, { operation: "look_at" });
    const result = await executeLookAt(args);
    return {
      content: [{ type: "text", text: result }],
    };
  },
);

/** 注册 artifact_search 工具 */
server.tool(
  "artifact_search",
  "搜索历史账本、计划和设计文档。用于查找过去的工件。",
  artifactSearchSchema,
  async (args) => {
    log.info(`搜索: ${args.query}, 类型: ${args.type || "all"}`, { operation: "artifact_search" });
    const result = await executeArtifactSearch(args);
    return {
      content: [{ type: "text", text: result }],
    };
  },
);

/** 注册 load_ledger 工具 */
server.tool(
  "load_ledger",
  "加载最新的会话账本。用于恢复会话上下文。",
  loadLedgerSchema,
  async () => {
    log.info("加载会话账本", { operation: "load_ledger" });
    const result = await executeLoadLedger({});
    return {
      content: [{ type: "text", text: result }],
    };
  },
);

// ============================================
// 注册 AST 工具
// ============================================

/** 注册 ast_grep_search 工具 */
server.tool(
  "ast_grep_search",
  "基于 AST 的代码搜索。用于结构化代码模式匹配。",
  astGrepSearchSchema,
  async (args) => {
    log.info(`AST 搜索: ${args.pattern}`, { operation: "ast_grep_search" });
    const result = await executeAstGrepSearch(args);
    return {
      content: [{ type: "text", text: result }],
    };
  },
);

/** 注册 ast_grep_replace 工具 */
server.tool(
  "ast_grep_replace",
  "基于 AST 的代码替换。用于结构化代码重写。",
  astGrepReplaceSchema,
  async (args) => {
    log.info(`AST 替换: ${args.pattern} → ${args.replacement}`, { operation: "ast_grep_replace" });
    const result = await executeAstGrepReplace(args);
    return {
      content: [{ type: "text", text: result }],
    };
  },
);

// ============================================
// 注册 PTY 工具
// ============================================

/** 注册 pty_spawn 工具 */
server.tool(
  "pty_spawn",
  "启动后台进程会话。用于长时间运行的任务（如开发服务器、测试监视器）。",
  ptySpawnSchema,
  async (args) => {
    log.info(`启动 PTY: ${args.command}`, { operation: "pty_spawn" });
    const result = await executePtySpawn(args);
    return {
      content: [{ type: "text", text: result }],
    };
  },
);

/** 注册 pty_write 工具 */
server.tool(
  "pty_write",
  "向 PTY 会话发送输入。用于与后台进程交互。",
  ptyWriteSchema,
  async (args) => {
    log.info(`PTY 写入: ${args.sessionId}`, { operation: "pty_write" });
    const result = await executePtyWrite(args);
    return {
      content: [{ type: "text", text: result }],
    };
  },
);

/** 注册 pty_read 工具 */
server.tool(
  "pty_read",
  "读取 PTY 会话的输出。用于获取后台进程的状态。",
  ptyReadSchema,
  async (args) => {
    log.info(`PTY 读取: ${args.sessionId}`, { operation: "pty_read" });
    const result = await executePtyRead(args);
    return {
      content: [{ type: "text", text: result }],
    };
  },
);

/** 注册 pty_list 工具 */
server.tool(
  "pty_list",
  "列出所有活动的 PTY 会话。",
  ptyListSchema,
  async () => {
    log.info("列出 PTY 会话", { operation: "pty_list" });
    const result = await executePtyList({});
    return {
      content: [{ type: "text", text: result }],
    };
  },
);

/** 注册 pty_kill 工具 */
server.tool(
  "pty_kill",
  "终止 PTY 会话。用于停止后台进程。",
  ptyKillSchema,
  async (args) => {
    log.info(`终止 PTY: ${args.sessionId}`, { operation: "pty_kill" });
    const result = await executePtyKill(args);
    return {
      content: [{ type: "text", text: result }],
    };
  },
);

// ============================================
// 启动服务器
// ============================================

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  log.info(`${PLUGIN_META.name} v${PLUGIN_META.version} 已启动`, { module: "mcp-server" });
}

main().catch((error) => {
  const err = error instanceof Error ? error : new Error(String(error));
  log.error("启动失败", { module: "mcp-server", error: err });
  process.exit(1);
});
