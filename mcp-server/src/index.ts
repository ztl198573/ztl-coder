/**
 * ztl-coder MCP 服务器入口
 * 提供完整的 MCP 工具集
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
} from "./tools";
import {
  astGrepSearchSchema,
  executeAstGrepSearch,
} from "./tools/ast-grep-search";
import {
  astGrepReplaceSchema,
  executeAstGrepReplace,
} from "./tools/ast-grep-replace";
import {
  ptyManagerSchema,
  executePtyManager,
} from "./tools/pty-manager";

/** 创建 MCP 服务器 */
const server = new McpServer({
  name: PLUGIN_META.name,
  version: PLUGIN_META.version,
});

/** 注册 look_at 工具 */
server.tool(
  "ztl_code_look_at",
  "提取文件结构，节省上下文。用于大型文件或获取文件概览。",
  lookAtSchema,
  async (args) => {
    log.info("ztl_code_look_at", `查看文件: ${args.filePath}`);
    const result = await executeLookAt(args);
    return {
      content: [{ type: "text", text: result }],
    };
  },
);

/** 注册 artifact_search 工具 */
server.tool(
  "ztl_code_artifact_search",
  "搜索历史账本、计划和设计文档。用于查找过去的工件。",
  artifactSearchSchema,
  async (args) => {
    log.info("ztl_code_artifact_search", `搜索: ${args.query}, 类型: ${args.type || "all"}`);
    const result = await executeArtifactSearch(args);
    return {
      content: [{ type: "text", text: result }],
    };
  },
);

/** 注册 load_ledger 工具 */
server.tool(
  "ztl_code_load_ledger",
  "加载最新的会话账本。用于恢复会话上下文。",
  loadLedgerSchema,
  async () => {
    log.info("ztl_code_load_ledger", "加载会话账本");
    const result = await executeLoadLedger({});
    return {
      content: [{ type: "text", text: result }],
    };
  },
);

/** 注册 ast_grep_search 工具 */
server.tool(
  "ztl_code_ast_grep_search",
  "AST 语法树搜索。用于精确的代码模式匹配，比正则更精确。",
  astGrepSearchSchema,
  async (args) => {
    log.info("ztl_code_ast_grep_search", `搜索: ${args.pattern}, 语言: ${args.language}`);
    const result = await executeAstGrepSearch(args);
    return {
      content: [{ type: "text", text: result }],
    };
  },
);

/** 注册 ast_grep_replace 工具 */
server.tool(
  "ztl_code_ast_grep_replace",
  "AST 语法树替换。用于安全的代码重构，默认 dry-run 模式预览更改。",
  astGrepReplaceSchema,
  async (args) => {
    log.info("ztl_code_ast_grep_replace", `替换: ${args.pattern} -> ${args.replacement}`);
    const result = await executeAstGrepReplace(args);
    return {
      content: [{ type: "text", text: result }],
    };
  },
);

/** 注册 pty_manager 工具 */
server.tool(
  "ztl_code_pty_manager",
  "PTY 会话管理。用于运行后台进程（如开发服务器、watch 模式）。",
  ptyManagerSchema,
  async (args) => {
    log.info("ztl_code_pty_manager", `操作: ${args.operation}`);
    const result = await executePtyManager(args);
    return {
      content: [{ type: "text", text: result }],
    };
  },
);

/** 启动服务器 */
async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  log.info("mcp-server", `${PLUGIN_META.name} v${PLUGIN_META.version} 已启动`);
}

 main().catch((error) => {
  log.error("mcp-server", "启动失败", error);
  process.exit(1);
});
