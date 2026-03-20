/**
 * AST 搜索工具
 *
 * 提供基于 AST 的代码搜索和分析功能
 */

export * from "./types.ts";
export { createParser } from "./parser.ts";
export { createSearcher } from "./searcher.ts";

// 便捷导出
import { createSearcher } from "./searcher.ts";
import { createParser } from "./parser.ts";

/** 默认搜索器实例 */
export const astSearcher = createSearcher();

/** 默认解析器实例 */
export const astParser = createParser();
