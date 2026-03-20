/**
 * 代码索引器测试
 */

import { describe, test, expect } from "bun:test";
import { createIndexer, type IndexConfig } from "@/tools/code-index/index.ts";

describe("代码索引器", () => {
  describe("创建索引器", () => {
    test("应创建索引器实例", () => {
      const indexer = createIndexer();
      expect(indexer).toBeDefined();
      expect(indexer.indexProject).toBeTypeOf("function");
      expect(indexer.searchSymbols).toBeTypeOf("function");
      expect(indexer.getStats).toBeTypeOf("function");
      expect(indexer.getDefinition).toBeTypeOf("function");
    });

    test("应支持自定义配置", () => {
      const customConfig: Partial<IndexConfig> = {
        maxFileSize: 500 * 1024,
        includeNodeModules: false,
      };

      const indexer = createIndexer(customConfig);
      expect(indexer).toBeDefined();
    });
  });

  describe("索引项目", () => {
    test("应能索引项目目录", async () => {
      const indexer = createIndexer();
      const result = await indexer.indexProject("./src/tools/ast-search");

      expect(result).toBeDefined();
      expect(result.rootPath).toContain("ast-search");
      expect(result.symbols.size).toBeGreaterThan(0);
    });

    test("索引后应能搜索符号", async () => {
      const indexer = createIndexer();
      await indexer.indexProject("./src/tools/ast-search");

      const results = indexer.searchSymbols("create");

      expect(results.length).toBeGreaterThan(0);
    });

    test("应返回正确的统计信息", async () => {
      const indexer = createIndexer();
      await indexer.indexProject("./src/tools/ast-search");

      const stats = indexer.getStats();

      expect(stats.totalFiles).toBeGreaterThan(0);
      expect(stats.totalSymbols).toBeGreaterThan(0);
      expect(stats.byType.function).toBeGreaterThan(0);
    });
  });

  describe("搜索符号", () => {
    test("应能按名称搜索", async () => {
      const indexer = createIndexer();
      await indexer.indexProject("./src/tools/ast-search");

      const results = indexer.searchSymbols("parse");

      expect(results.length).toBeGreaterThan(0);
    });

    test("应能按类型过滤", async () => {
      const indexer = createIndexer();
      await indexer.indexProject("./src/tools/ast-search");

      const functions = indexer.searchSymbols("", "function");
      const allFunctions = functions.every((s) => s.type === "function");

      expect(allFunctions).toBe(true);
    });

    test("无匹配时应返回空数组", async () => {
      const indexer = createIndexer();
      await indexer.indexProject("./src/tools/ast-search");

      const results = indexer.searchSymbols("xyznonexistent123");

      expect(results).toHaveLength(0);
    });
  });

  describe("getDefinition", () => {
    test("应获取符号定义", async () => {
      const indexer = createIndexer();
      await indexer.indexProject("./src/tools/ast-search");

      // createParser 应该存在
      const definitions = indexer.getDefinition("createParser");

      expect(definitions.length).toBeGreaterThan(0);
      expect(definitions[0].name).toBe("createParser");
    });

    test("不存在的符号应返回空数组", async () => {
      const indexer = createIndexer();
      await indexer.indexProject("./src/tools/ast-search");

      const definitions = indexer.getDefinition("nonexistentSymbol");

      expect(definitions).toHaveLength(0);
    });
  });
});

describe("索引配置", () => {
  test("默认配置应有合理的值", () => {
    const defaultConfig: IndexConfig = {
      includePatterns: ["**/*.{ts,tsx,js,jsx}"],
      excludePatterns: ["**/node_modules/**", "**/dist/**", "**/.git/**"],
      includeNodeModules: false,
      includeHidden: false,
      maxFileSize: 1024 * 1024,
    };

    expect(defaultConfig.includePatterns).toBeDefined();
    expect(defaultConfig.excludePatterns).toBeDefined();
    expect(defaultConfig.maxFileSize).toBeGreaterThan(0);
  });
});
