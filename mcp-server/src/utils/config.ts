/**
 * 配置常量
 * 集中管理所有可调参数
 */

/** 路径配置 */
export const PATHS = {
  /** 账本目录 */
  ledgerDir: "thoughts/ledgers",
  /** 共享目录 */
  sharedDir: "thoughts/shared",
  /** 设计文档目录 */
  designsDir: "thoughts/shared/designs",
  /** 计划文档目录 */
  plansDir: "thoughts/shared/plans",
  /** 账本前缀 */
  ledgerPrefix: "CONTINUITY_",
  /** 根上下文文件 */
  rootContextFiles: ["ARCHITECTURE.md", "CODE_STYLE.md", "CLAUDE.md"],
  /** 目录上下文文件 */
  dirContextFiles: ["CLAUDE.md", "AGENTS.md", "README.md"],
} as const;

/** 限制配置 */
export const LIMITS = {
  /** 大文件阈值 (100KB) */
  largeFileThreshold: 100 * 1024,
  /** 无提取最大行数 */
  maxLinesWithoutExtract: 200,
  /** 签名最大长度 */
  maxSignatureLength: 80,
  /** 上下文缓存 TTL (ms) */
  contextCacheTtlMs: 30000,
  /** 上下文缓存最大大小 */
  contextCacheMaxSize: 100,
  /** 搜索结果最大数量 */
  maxSearchResults: 10,
  /** PTY 最大会话数 */
  maxPtySessions: 5,
  /** PTY 输出缓冲最大行数 */
  maxPtyOutputLines: 1000,
} as const;

/** 支持提取的文件扩展名 */
export const EXTRACTABLE_EXTENSIONS = [
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".py",
  ".go",
  ".rs",
  ".java",
  ".md",
  ".json",
  ".yaml",
  ".yml",
] as const;

/** 插件元数据 */
export const PLUGIN_META = {
  name: "ztl-coder",
  version: "2.0.0",
  description: "Claude Code plugin with Brainstorm-Plan-Implement-Review workflow",
} as const;
