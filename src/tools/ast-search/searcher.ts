/**
 * AST 搜索器
 *
 * 提供基于 AST 的代码搜索功能
 */

import { $ } from "bun";
import type {
  ASTSearcher,
  SearchOptions,
  SearchResult,
  FunctionInfo,
  ClassInfo,
  InterfaceInfo,
  CallRelation,
  NodeType,
} from "./types.ts";
import { createParser, parseFunctions, parseClasses, parseInterfaces } from "./parser.ts";

/** 默认搜索选项 */
const DEFAULT_OPTIONS: SearchOptions = {
  filePattern: "**/*.{ts,tsx,js,jsx}",
  includeChildren: false,
  maxResults: 100,
  caseSensitive: false,
  contextLines: 3,
};

/** 获取匹配的文件列表 */
async function getMatchingFiles(pattern: string, cwd: string = "."): Promise<string[]> {
  const files: string[] = [];
  const glob = new Bun.Glob(pattern);
  for await (const file of glob.scan({ cwd })) {
    files.push(file);
  }
  return files;
}

/** 搜索上下文提取 */
function extractContext(code: string, line: number, contextLines: number): string {
  const lines = code.split("\n");
  const start = Math.max(0, line - contextLines - 1);
  const end = Math.min(lines.length, line + contextLines);
  return lines.slice(start, end).map((l, i) => `${start + i + 1}: ${l}`).join("\n");
}

/** 计算相关性分数 */
function calculateScore(query: string, name: string): number {
  const lowerQuery = query.toLowerCase();
  const lowerName = name.toLowerCase();
  if (lowerName === lowerQuery) return 1.0;
  if (lowerName.startsWith(lowerQuery)) return 0.9;
  if (lowerName.includes(lowerQuery)) return 0.7;
  return 0;
}

/** 创建 AST 搜索器实例 */
export function createSearcher(): ASTSearcher {
  const parser = createParser();
  const functionCache = new Map<string, FunctionInfo[]>();
  const classCache = new Map<string, ClassInfo[]>();
  const interfaceCache = new Map<string, InterfaceInfo[]>();

  return {
    async searchByName(name: string, options?: SearchOptions): Promise<SearchResult[]> {
      const opts = { ...DEFAULT_OPTIONS, ...options };
      const results: SearchResult[] = [];
      const files = await getMatchingFiles(opts.filePattern || "**/*.{ts,tsx,js,jsx}");
      const searchName = opts.caseSensitive ? name : name.toLowerCase();

      for (const file of files) {
        if (results.length >= (opts.maxResults || 100)) break;
        try {
          const code = await Bun.file(file).text();
          const functions = parseFunctions(code, file);
          const classes = parseClasses(code, file);
          const interfaces = parseInterfaces(code, file);

          for (const { node, info } of functions) {
            const targetName = opts.caseSensitive ? info.name : info.name.toLowerCase();
            if (targetName.includes(searchName)) {
              results.push({
                filePath: file,
                node,
                context: extractContext(code, node.startLine, opts.contextLines || 3),
                matchType: "pattern",
                score: calculateScore(name, info.name),
              });
            }
          }
          for (const { node, info } of classes) {
            const targetName = opts.caseSensitive ? info.name : info.name.toLowerCase();
            if (targetName.includes(searchName)) {
              results.push({
                filePath: file,
                node,
                context: extractContext(code, node.startLine, opts.contextLines || 3),
                matchType: "pattern",
                score: calculateScore(name, info.name),
              });
            }
          }
          for (const { node, info } of interfaces) {
            const targetName = opts.caseSensitive ? info.name : info.name.toLowerCase();
            if (targetName.includes(searchName)) {
              results.push({
                filePath: file,
                node,
                context: extractContext(code, node.startLine, opts.contextLines || 3),
                matchType: "pattern",
                score: calculateScore(name, info.name),
              });
            }
          }
        } catch { /* ignore */ }
      }
      return results.sort((a, b) => b.score - a.score).slice(0, opts.maxResults);
    },

    async searchByType(type: NodeType, options?: SearchOptions): Promise<SearchResult[]> {
      const opts = { ...DEFAULT_OPTIONS, ...options };
      const results: SearchResult[] = [];
      const files = await getMatchingFiles(opts.filePattern || "**/*.{ts,tsx,js,jsx}");

      for (const file of files) {
        if (results.length >= (opts.maxResults || 100)) break;
        try {
          const ast = await parser.parseFile(file);
          if (!ast) continue;
          const code = await Bun.file(file).text();

          function searchNodes(node: typeof ast | null) {
            if (!node) return;
            if (results.length >= (opts.maxResults || 100)) return;
            const typeMatch =
              node.type === type ||
              (type === "function" && (node.type === "function_declaration" || node.type === "arrow_function")) ||
              (type === "class" && node.type === "class_declaration") ||
              (type === "interface" && node.type === "interface_declaration");
            if (typeMatch) {
              results.push({
                filePath: file,
                node: node as never,
                context: extractContext(code, node.startLine, opts.contextLines || 3),
                matchType: "exact",
                score: 1.0,
              });
            }
            if (opts.includeChildren) {
              for (const child of node.children) searchNodes(child);
            }
          }
          searchNodes(ast);
        } catch { /* ignore */ }
      }
      return results;
    },

    async searchByPattern(pattern: string, options?: SearchOptions): Promise<SearchResult[]> {
      const opts = { ...DEFAULT_OPTIONS, ...options };
      const results: SearchResult[] = [];
      let regex: RegExp;
      try {
        regex = new RegExp(pattern, opts.caseSensitive ? "g" : "gi");
      } catch {
        regex = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), opts.caseSensitive ? "g" : "gi");
      }
      const files = await getMatchingFiles(opts.filePattern || "**/*.{ts,tsx,js,jsx}");

      for (const file of files) {
        if (results.length >= (opts.maxResults || 100)) break;
        try {
          const text = await Bun.file(file).text();
          let match;
          while ((match = regex.exec(text)) !== null) {
            if (results.length >= (opts.maxResults || 100)) break;
            const line = text.slice(0, match.index).split("\n").length;
            const column = match.index - text.lastIndexOf("\n", match.index - 1);
            results.push({
              filePath: file,
              node: {
                id: `match_${match.index}`,
                type: "unknown",
                startLine: line,
                startColumn: column,
                endLine: line,
                endColumn: column + match[0].length,
                text: match[0],
                children: [],
                filePath: file,
              } as never,
              context: extractContext(text, line, opts.contextLines || 3),
              matchType: "pattern",
              score: 0.8,
            });
          }
        } catch { /* ignore */ }
      }
      return results;
    },

    async getFunctionDefinition(name: string): Promise<FunctionInfo | null> {
      if (functionCache.has(name)) return functionCache.get(name)![0] || null;
      const files = await getMatchingFiles("**/*.{ts,tsx,js,jsx}");
      for (const file of files) {
        try {
          const code = await Bun.file(file).text();
          const functions = parseFunctions(code, file);
          for (const { info } of functions) {
            if (info.name === name) {
              if (!functionCache.has(name)) functionCache.set(name, []);
              functionCache.get(name)!.push(info);
              return info;
            }
          }
        } catch { /* ignore */ }
      }
      return null;
    },

    async getClassDefinition(name: string): Promise<ClassInfo | null> {
      if (classCache.has(name)) return classCache.get(name)![0] || null;
      const files = await getMatchingFiles("**/*.{ts,tsx,js,jsx}");
      for (const file of files) {
        try {
          const code = await Bun.file(file).text();
          const classes = parseClasses(code, file);
          for (const { info } of classes) {
            if (info.name === name) {
              if (!classCache.has(name)) classCache.set(name, []);
              classCache.get(name)!.push(info);
              return info;
            }
          }
        } catch { /* ignore */ }
      }
      return null;
    },

    async getInterfaceDefinition(name: string): Promise<InterfaceInfo | null> {
      if (interfaceCache.has(name)) return interfaceCache.get(name)![0] || null;
      const files = await getMatchingFiles("**/*.{ts,tsx,js,jsx}");
      for (const file of files) {
        try {
          const code = await Bun.file(file).text();
          const interfaces = parseInterfaces(code, file);
          for (const { info } of interfaces) {
            if (info.name === name) {
              if (!interfaceCache.has(name)) interfaceCache.set(name, []);
              interfaceCache.get(name)!.push(info);
              return info;
            }
          }
        } catch { /* ignore */ }
      }
      return null;
    },

    async getCallers(functionName: string): Promise<CallRelation[]> {
      const relations: CallRelation[] = [];
      const funcInfo = await this.getFunctionDefinition(functionName);
      if (!funcInfo) return relations;
      const files = await getMatchingFiles("**/*.{ts,tsx,js,jsx}");
      const callRegex = new RegExp(`\\b${functionName}\\s*\\(`, "g");
      for (const file of files) {
        try {
          const code = await Bun.file(file).text();
          let match;
          while ((match = callRegex.exec(code)) !== null) {
            const line = code.slice(0, match.index).split("\n").length;
            const column = match.index - code.lastIndexOf("\n", match.index - 1);
            relations.push({
              caller: { name: "unknown", filePath: file, line },
              callee: { name: functionName, filePath: funcInfo.filePath, line: funcInfo.startLine },
              location: { filePath: file, line, column },
            });
          }
        } catch { /* ignore */ }
      }
      return relations;
    },

    async getCallees(functionName: string): Promise<CallRelation[]> {
      const relations: CallRelation[] = [];
      const funcInfo = await this.getFunctionDefinition(functionName);
      if (!funcInfo) return relations;
      try {
        const code = await Bun.file(funcInfo.filePath).text();
        const lines = code.split("\n");
        const funcBody = lines.slice(funcInfo.startLine - 1, funcInfo.endLine).join("\n");
        const callRegex = /(\w+)\s*\(/g;
        let match;
        const seen = new Set<string>();
        while ((match = callRegex.exec(funcBody)) !== null) {
          const calleeName = match[1];
          if (["if", "for", "while", "switch", "catch", "return", "function", "async", "await", functionName].includes(calleeName)) continue;
          if (seen.has(calleeName)) continue;
          seen.add(calleeName);
          const calleeInfo = await this.getFunctionDefinition(calleeName);
          relations.push({
            caller: { name: functionName, filePath: funcInfo.filePath, line: funcInfo.startLine },
            callee: { name: calleeName, filePath: calleeInfo?.filePath, line: calleeInfo?.startLine },
            location: { filePath: funcInfo.filePath, line: funcInfo.startLine, column: 1 },
          });
        }
      } catch { /* ignore */ }
      return relations;
    },
  };
}
