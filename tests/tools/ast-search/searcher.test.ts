/**
 * AST 搜索器测试
 */

import { describe, test, expect, beforeEach } from "bun:test";
import { createSearcher, createParser, astSearcher } from "@/tools/ast-search/index.ts";
import type { SearchOptions } from "@/tools/ast-search/types.ts";

// 样例代码用于测试
const sampleCode = `
import { useState, useEffect } from "react";

interface User {
  id: number;
  name: string;
}

function greet(name: string): string {
  return \`Hello, \${name}!\`;
}

const add = (a: number, b: number): number => {
  return a + b;
};

class UserService {
  private users: User[] = [];

  addUser(user: User): void {
    this.users.push(user);
  }

  getUser(id: number): User | undefined {
    return this.users.find(u => u.id === id);
  }
}

export { greet, add, UserService };
`;

describe("AST 搜索器", () => {
  describe("createSearcher", () => {
    test("应创建搜索器实例", () => {
      const searcher = createSearcher();
      expect(searcher).toBeDefined();
      expect(searcher.searchByName).toBeTypeOf("function");
      expect(searcher.searchByType).toBeTypeOf("function");
      expect(searcher.searchByPattern).toBeTypeOf("function");
    });
  });

  describe("createParser", () => {
    test("应创建解析器实例", () => {
      const parser = createParser();
      expect(parser).toBeDefined();
      expect(parser.parseCode).toBeTypeOf("function");
      expect(parser.parseFile).toBeTypeOf("function");
    });

    test("应解析代码为 AST", () => {
      const parser = createParser();
      const ast = parser.parseCode(sampleCode, "test.ts");

      expect(ast).toBeDefined();
      expect(ast.children.length).toBeGreaterThan(0);
    });
  });

  describe("astSearcher (默认实例)", () => {
    test("应该是可用的", () => {
      expect(astSearcher).toBeDefined();
      expect(astSearcher.searchByName).toBeTypeOf("function");
    });
  });
});

describe("解析功能", () => {
  const parser = createParser();

  describe("parseCode", () => {
    test("应解析 TypeScript 代码", () => {
      const ast = parser.parseCode("const x = 1;", "test.ts");
      expect(ast).toBeDefined();
    });

    test("应解析包含函数的代码", () => {
      const ast = parser.parseCode("function test() { return 1; }", "test.ts");
      expect(ast).toBeDefined();
    });

    test("应解析包含类的代码", () => {
      const ast = parser.parseCode("class Foo {}", "test.ts");
      expect(ast).toBeDefined();
    });

    test("空代码应返回根节点", () => {
      const ast = parser.parseCode("", "test.ts");
      expect(ast.type).toBe("unknown");
    });

    test("应识别函数", () => {
      const ast = parser.parseCode("function hello() {}", "test.ts");
      const funcNodes = ast.children.filter((c) => c.type.includes("function"));
      expect(funcNodes.length).toBeGreaterThan(0);
    });

    test("应识别类", () => {
      const ast = parser.parseCode("class MyClass {}", "test.ts");
      const classNodes = ast.children.filter((c) => c.type.includes("class"));
      expect(classNodes.length).toBeGreaterThan(0);
    });

    test("应识别接口", () => {
      const ast = parser.parseCode("interface ITest { x: number; }", "test.ts");
      const interfaceNodes = ast.children.filter((c) => c.type.includes("interface"));
      expect(interfaceNodes.length).toBeGreaterThan(0);
    });
  });

  describe("getSupportedLanguages", () => {
    test("应返回支持的语言列表", () => {
      const languages = parser.getSupportedLanguages();
      expect(languages).toContain("typescript");
      expect(languages).toContain("javascript");
      expect(languages).toContain("tsx");
      expect(languages).toContain("jsx");
    });
  });

  describe("isLanguageSupported", () => {
    test("应正确识别支持的语言", () => {
      expect(parser.isLanguageSupported("test.ts")).toBe(true);
      expect(parser.isLanguageSupported("test.tsx")).toBe(true);
      expect(parser.isLanguageSupported("test.js")).toBe(true);
      expect(parser.isLanguageSupported("test.jsx")).toBe(true);
      expect(parser.isLanguageSupported("test.py")).toBe(false);
      expect(parser.isLanguageSupported("test.go")).toBe(false);
    });
  });
});

describe("搜索选项", () => {
  test("默认选项应有合理的值", () => {
    const options: SearchOptions = {
      filePattern: "**/*.{ts,tsx,js,jsx}",
      includeChildren: false,
      maxResults: 100,
      caseSensitive: false,
      contextLines: 3,
    };

    expect(options.filePattern).toBeDefined();
    expect(options.maxResults).toBeGreaterThan(0);
  });
});
