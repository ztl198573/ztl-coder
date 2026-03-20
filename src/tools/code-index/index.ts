/**
 * 代码索引系统
 *
 * 提供项目代码符号索引和快速跳转功能
 */

import { $ } from "bun";
import type { FunctionInfo, ClassInfo, InterfaceInfo } from "../ast-search/types.ts";
import { parseFunctions, parseClasses, parseInterfaces } from "../ast-search/parser.ts";

/** 符号类型 */
export type SymbolType = "function" | "class" | "interface" | "variable" | "constant" | "type" | "enum";

/** 符号条目 */
export interface SymbolEntry {
  /** 符号名称 */
  name: string;
  /** 符号类型 */
  type: SymbolType;
  /** 文件路径 */
  filePath: string;
  /** 行号 */
  line: number;
  /** 列号 */
  column: number;
  /** 简短描述 */
  description?: string;
  /** 签名（用于函数） */
  signature?: string;
  /** 是否导出 */
  isExported: boolean;
}

/** 文件索引 */
export interface FileIndex {
  /** 文件路径 */
  path: string;
  /** 最后修改时间 */
  lastModified: Date;
  /** 符号列表 */
  symbols: SymbolEntry[];
  /** 导入列表 */
  imports: string[];
  /** 导出列表 */
  exports: string[];
  /** 文件哈希 */
  hash: string;
}

/** 项目索引 */
export interface ProjectIndex {
  /** 项目根目录 */
  rootPath: string;
  /** 所有符号 */
  symbols: Map<string, SymbolEntry[]>;
  /** 文件索引 */
  files: Map<string, FileIndex>;
  /** 最后更新时间 */
  lastUpdated: Date;
  /** 索引版本 */
  version: string;
}

/** 索引配置 */
export interface IndexConfig {
  /** 要索引的文件模式 */
  includePatterns: string[];
  /** 要排除的文件模式 */
  excludePatterns: string[];
  /** 是否索引 node_modules */
  includeNodeModules: boolean;
  /** 是否索引隐藏文件 */
  includeHidden: boolean;
  /** 最大文件大小（字节） */
  maxFileSize: number;
}

const DEFAULT_CONFIG: IndexConfig = {
  includePatterns: ["**/*.{ts,tsx,js,jsx}"],
  excludePatterns: ["**/node_modules/**", "**/dist/**", "**/.git/**"],
  includeNodeModules: false,
  includeHidden: false,
  maxFileSize: 1024 * 1024, // 1MB
};

/**
 * 计算文件哈希
 */
async function calculateHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.slice(0, 16).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * 检查文件是否匹配模式
 */
function matchesPattern(path: string, patterns: string[]): boolean {
  for (const pattern of patterns) {
    const regex = new RegExp(
      pattern
        .replace(/\*\*/g, ".*")
        .replace(/\*/g, "[^/]*")
        .replace(/\./g, "\\.")
        .replace(/{([^}]+)}/g, (_, g) => `(${g.split(",").join("|")})`),
    );
    if (regex.test(path)) return true;
  }
  return false;
}

/**
 * 索引单个文件
 */
async function indexFile(
  filePath: string,
  config: IndexConfig,
): Promise<FileIndex | null> {
  try {
    const file = Bun.file(filePath);
    const stat = await file.stat();

    if (!stat || stat.size > config.maxFileSize) {
      return null;
    }

    const content = await file.text();
    const hash = await calculateHash(content);
    const symbols: SymbolEntry[] = [];
    const imports: string[] = [];
    const exports: string[] = [];

    // 解析函数
    const functions = parseFunctions(content, filePath);
    for (const { info } of functions) {
      symbols.push({
        name: info.name,
        type: "function",
        filePath,
        line: info.startLine,
        column: 1,
        signature: `(${info.parameters.join(", ")})${info.returnType ? `: ${info.returnType}` : ""}`,
        isExported: info.isExported,
      });
    }

    // 解析类
    const classes = parseClasses(content, filePath);
    for (const { info } of classes) {
      symbols.push({
        name: info.name,
        type: "class",
        filePath,
        line: info.startLine,
        column: 1,
        description: info.extends ? `extends ${info.extends}` : undefined,
        isExported: info.isExported,
      });
    }

    // 解析接口
    const interfaces = parseInterfaces(content, filePath);
    for (const { info } of interfaces) {
      symbols.push({
        name: info.name,
        type: "interface",
        filePath,
        line: info.startLine,
        column: 1,
        isExported: info.isExported,
      });
    }

    return {
      path: filePath,
      lastModified: new Date(stat.mtime),
      symbols,
      imports,
      exports,
      hash,
    };
  } catch {
    return null;
  }
}

/**
 * 创建代码索引器
 */
export function createIndexer(config: Partial<IndexConfig> = {}) {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const projectIndex: ProjectIndex = {
    rootPath: process.cwd(),
    symbols: new Map(),
    files: new Map(),
    lastUpdated: new Date(),
    version: "1.0.0",
  };

  return {
    /** 索引项目 */
    async indexProject(rootPath?: string): Promise<ProjectIndex> {
      if (rootPath) {
        projectIndex.rootPath = rootPath;
      }

      projectIndex.symbols.clear();
      projectIndex.files.clear();

      // 获取所有匹配的文件
      const files: string[] = [];
      for (const pattern of cfg.includePatterns) {
        const glob = new Bun.Glob(pattern);
        for await (const file of glob.scan({ cwd: projectIndex.rootPath })) {
          // 检查排除模式
          const shouldExclude = cfg.excludePatterns.some((p) => matchesPattern(file, [p]));
          if (shouldExclude) continue;

          // 检查 node_modules
          if (!cfg.includeNodeModules && file.includes("node_modules")) continue;

          // 检查隐藏文件
          if (!cfg.includeHidden && file.split("/").some((p) => p.startsWith("."))) continue;

          files.push(file);
        }
      }

      // 并行索引文件
      const batchSize = 50;
      for (let i = 0; i < files.length; i += batchSize) {
        const batch = files.slice(i, i + batchSize);
        const results = await Promise.all(
          batch.map((f) => indexFile(f, cfg)),
        );

        for (const result of results) {
          if (!result) continue;

          projectIndex.files.set(result.path, result);

          // 更新符号索引
          for (const symbol of result.symbols) {
            const key = symbol.name.toLowerCase();
            if (!projectIndex.symbols.has(key)) {
              projectIndex.symbols.set(key, []);
            }
            projectIndex.symbols.get(key)!.push(symbol);
          }
        }
      }

      projectIndex.lastUpdated = new Date();
      return projectIndex;
    },

    /** 搜索符号 */
    searchSymbols(query: string, type?: SymbolType): SymbolEntry[] {
      const results: SymbolEntry[] = [];
      const lowerQuery = query.toLowerCase();

      for (const [name, entries] of projectIndex.symbols) {
        if (name.includes(lowerQuery)) {
          for (const entry of entries) {
            if (!type || entry.type === type) {
              results.push(entry);
            }
          }
        }
      }

      return results.sort((a, b) => {
        // 精确匹配优先
        const aExact = a.name.toLowerCase() === lowerQuery ? 0 : 1;
        const bExact = b.name.toLowerCase() === lowerQuery ? 0 : 1;
        if (aExact !== bExact) return aExact - bExact;
        // 导出的优先
        if (a.isExported !== b.isExported) return b.isExported ? 1 : -1;
        return 0;
      });
    },

    /** 获取符号定义 */
    getDefinition(name: string): SymbolEntry[] {
      const key = name.toLowerCase();
      return projectIndex.symbols.get(key) || [];
    },

    /** 获取文件索引 */
    getFileIndex(filePath: string): FileIndex | undefined {
      return projectIndex.files.get(filePath);
    },

    /** 获取项目索引 */
    getProjectIndex(): ProjectIndex {
      return projectIndex;
    },

    /** 保存索引到文件 */
    async saveIndex(path: string): Promise<void> {
      const data = {
        rootPath: projectIndex.rootPath,
        symbols: Object.fromEntries(
          Array.from(projectIndex.symbols.entries()).map(([k, v]) => [k, v]),
        ),
        files: Object.fromEntries(
          Array.from(projectIndex.files.entries()).map(([k, v]) => [k, v]),
        ),
        lastUpdated: projectIndex.lastUpdated.toISOString(),
        version: projectIndex.version,
      };
      await Bun.write(path, JSON.stringify(data, null, 2));
    },

    /** 从文件加载索引 */
    async loadIndex(path: string): Promise<boolean> {
      try {
        const file = Bun.file(path);
        const data = await file.json();

        projectIndex.rootPath = data.rootPath;
        projectIndex.symbols = new Map(Object.entries(data.symbols));
        projectIndex.files = new Map(Object.entries(data.files));
        projectIndex.lastUpdated = new Date(data.lastUpdated);
        projectIndex.version = data.version;

        return true;
      } catch {
        return false;
      }
    },

    /** 获取统计信息 */
    getStats(): {
      totalFiles: number;
      totalSymbols: number;
      byType: Record<SymbolType, number>;
    } {
      const byType: Record<SymbolType, number> = {
        function: 0,
        class: 0,
        interface: 0,
        variable: 0,
        constant: 0,
        type: 0,
        enum: 0,
      };

      let totalSymbols = 0;
      for (const entries of projectIndex.symbols.values()) {
        for (const entry of entries) {
          totalSymbols++;
          byType[entry.type]++;
        }
      }

      return {
        totalFiles: projectIndex.files.size,
        totalSymbols,
        byType,
      };
    },
  };
}

/** 类型导出 */
export type CodeIndexer = ReturnType<typeof createIndexer>;
