/**
 * AST 解析器
 *
 * 基于正则表达式的轻量级 AST 解析器
 * 无需外部依赖，支持 TypeScript/JavaScript/TSX/JSX
 */

import type {
  ASTNode,
  ASTParser,
  FunctionInfo,
  ClassInfo,
  InterfaceInfo,
  ImportInfo,
  ExportInfo,
} from "./types.ts";

/** 生成唯一 ID */
function generateId(): string {
  return `node_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/** 语言检测 */
function detectLanguage(filePath: string): string {
  if (filePath.endsWith(".tsx")) return "tsx";
  if (filePath.endsWith(".jsx")) return "jsx";
  if (filePath.endsWith(".ts")) return "typescript";
  if (filePath.endsWith(".js")) return "javascript";
  if (filePath.endsWith(".mjs")) return "javascript";
  if (filePath.endsWith(".cjs")) return "javascript";
  return "unknown";
}

/** 获取行号 */
function getLineNumber(code: string, index: number): number {
  return code.slice(0, index).split("\n").length;
}

/** 获取列号 */
function getColumnNumber(code: string, index: number): number {
  const lines = code.slice(0, index).split("\n");
  return lines[lines.length - 1].length + 1;
}

/** 提取代码行 */
function extractCodeLine(code: string, line: number): string {
  const lines = code.split("\n");
  return lines[line - 1] || "";
}

/** 解析参数 */
function parseParams(paramsStr: string): string[] {
  if (!paramsStr.trim()) return [];
  return paramsStr
    .split(",")
    .map((p) => p.trim().split(":")[0].split("=")[0].trim())
    .filter((p) => p && !p.startsWith("..."));
}

/** 提取 JSDoc */
function extractJSDoc(code: string, index: string): string | undefined {
  const codeStr = code.slice(0, code.indexOf(index));
  const lines = codeStr.split("\n");
  const jsDocLines: string[] = [];

  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (line.startsWith("*") || line.startsWith("/**") || line.startsWith("*/")) {
      jsDocLines.unshift(line);
      if (line.startsWith("/**")) break;
    } else if (line !== "") {
      break;
    }
  }

  return jsDocLines.length > 0 ? jsDocLines.join("\n") : undefined;
}

/** 查找块结束位置 */
function findBlockEnd(code: string, startIndex: number): number {
  let braceCount = 0;
  let started = false;

  for (let i = startIndex; i < code.length; i++) {
    if (code[i] === "{") {
      braceCount++;
      started = true;
    } else if (code[i] === "}") {
      braceCount--;
      if (started && braceCount === 0) {
        return i + 1;
      }
    }
  }

  return code.length;
}

/**
 * 解析函数定义
 */
function parseFunctions(
  code: string,
  filePath: string,
): Array<{ node: ASTNode; info: FunctionInfo }> {
  const results: Array<{ node: ASTNode; info: FunctionInfo }> = [];

  // 函数声明: function name(...) {
  const funcDeclRegex =
    /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)(?:\s*:\s*([^{]+?))?\s*\{/g;

  // 箭头函数: const name = (...) =>
  const arrowFuncRegex =
    /(?:export\s+)?(?:const|let|var)\s+(\w+)(?:\s*:\s*([^=]+?))?\s*=\s*(?:async\s+)?\(([^)]*)\)\s*=>/g;

  let match;

  // 解析函数声明
  while ((match = funcDeclRegex.exec(code)) !== null) {
    const name = match[1];
    const params = match[2];
    const returnType = match[3]?.trim();
    const startLine = getLineNumber(code, match.index);
    const startColumn = getColumnNumber(code, match.index);
    const isExported = match[0].includes("export");
    const isAsync = match[0].includes("async");

    const node: ASTNode = {
      id: generateId(),
      type: "function_declaration",
      name,
      startLine,
      startColumn,
      endLine: startLine,
      endColumn: startColumn + match[0].length,
      text: match[0],
      children: [],
      filePath,
    };

    const info: FunctionInfo = {
      name,
      filePath,
      startLine,
      endLine: startLine,
      parameters: parseParams(params),
      returnType,
      isAsync,
      isExported,
      isArrow: false,
    };

    results.push({ node, info });
  }

  // 解析箭头函数
  while ((match = arrowFuncRegex.exec(code)) !== null) {
    const name = match[1];
    const returnType = match[2]?.trim();
    const params = match[3];
    const startLine = getLineNumber(code, match.index);
    const startColumn = getColumnNumber(code, match.index);
    const isExported = match[0].includes("export");
    const isAsync = match[0].includes("async");

    const node: ASTNode = {
      id: generateId(),
      type: "arrow_function",
      name,
      startLine,
      startColumn,
      endLine: startLine,
      endColumn: startColumn + match[0].length,
      text: match[0],
      children: [],
      filePath,
    };

    const info: FunctionInfo = {
      name,
      filePath,
      startLine,
      endLine: startLine,
      parameters: parseParams(params),
      returnType,
      isAsync,
      isExported,
      isArrow: true,
    };

    results.push({ node, info });
  }

  return results;
}

/**
 * 解析类定义
 */
function parseClasses(
  code: string,
  filePath: string,
): Array<{ node: ASTNode; info: ClassInfo }> {
  const results: Array<{ node: ASTNode; info: ClassInfo }> = [];

  const classRegex =
    /(?:export\s+)?(?:abstract\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([^{]+?))?\s*\{/g;

  let match;

  while ((match = classRegex.exec(code)) !== null) {
    const name = match[1];
    const extendsClass = match[2];
    const implementsStr = match[3];
    const startLine = getLineNumber(code, match.index);
    const startColumn = getColumnNumber(code, match.index);
    const isExported = match[0].includes("export");
    const isAbstract = match[0].includes("abstract");

    const classEnd = findBlockEnd(code, match.index);
    const classBody = code.slice(match.index, classEnd);

    // 提取方法
    const methods: string[] = [];
    const methodRegex = /(?:async\s+)?(\w+)\s*\([^)]*\)/g;
    let methodMatch;
    while ((methodMatch = methodRegex.exec(classBody)) !== null) {
      if (!["if", "for", "while", "switch", "catch"].includes(methodMatch[1])) {
        methods.push(methodMatch[1]);
      }
    }

    // 提取属性
    const properties: string[] = [];
    const propRegex = /(?:public|private|protected|readonly)\s+(\w+)/g;
    let propMatch;
    while ((propMatch = propRegex.exec(classBody)) !== null) {
      properties.push(propMatch[1]);
    }

    const node: ASTNode = {
      id: generateId(),
      type: "class_declaration",
      name,
      startLine,
      startColumn,
      endLine: getLineNumber(code, classEnd),
      endColumn: getColumnNumber(code, classEnd),
      text: classBody.slice(0, 100),
      children: [],
      filePath,
    };

    const info: ClassInfo = {
      name,
      filePath,
      startLine,
      endLine: getLineNumber(code, classEnd),
      extends: extendsClass,
      implements: implementsStr?.split(",").map((s) => s.trim()) || [],
      methods,
      properties,
      isExported,
      isAbstract,
    };

    results.push({ node, info });
  }

  return results;
}

/**
 * 解析接口定义
 */
function parseInterfaces(
  code: string,
  filePath: string,
): Array<{ node: ASTNode; info: InterfaceInfo }> {
  const results: Array<{ node: ASTNode; info: InterfaceInfo }> = [];

  const interfaceRegex =
    /(?:export\s+)?interface\s+(\w+)(?:\s+extends\s+([^{]+?))?\s*\{/g;

  let match;

  while ((match = interfaceRegex.exec(code)) !== null) {
    const name = match[1];
    const extendsStr = match[2];
    const startLine = getLineNumber(code, match.index);
    const startColumn = getColumnNumber(code, match.index);
    const isExported = match[0].includes("export");

    const interfaceEnd = findBlockEnd(code, match.index);
    const interfaceBody = code.slice(match.index, interfaceEnd);

    // 提取方法签名
    const methods: string[] = [];
    const methodRegex = /(\w+)\s*\([^)]*\)\s*:/g;
    let methodMatch;
    while ((methodMatch = methodRegex.exec(interfaceBody)) !== null) {
      methods.push(methodMatch[1]);
    }

    // 提取属性签名
    const properties: string[] = [];
    const propRegex = /(\w+)\s*[?!]?\s*:/g;
    let propMatch;
    while ((propMatch = propRegex.exec(interfaceBody)) !== null) {
      if (!methods.includes(propMatch[1])) {
        properties.push(propMatch[1]);
      }
    }

    const node: ASTNode = {
      id: generateId(),
      type: "interface_declaration",
      name,
      startLine,
      startColumn,
      endLine: getLineNumber(code, interfaceEnd),
      endColumn: getColumnNumber(code, interfaceEnd),
      text: interfaceBody.slice(0, 100),
      children: [],
      filePath,
    };

    const info: InterfaceInfo = {
      name,
      filePath,
      startLine,
      endLine: getLineNumber(code, interfaceEnd),
      extends: extendsStr?.split(",").map((s) => s.trim()) || [],
      methods,
      properties,
      isExported,
    };

    results.push({ node, info });
  }

  return results;
}

/**
 * 解析导入语句
 */
function parseImports(code: string, filePath: string): ImportInfo[] {
  const results: ImportInfo[] = [];

  const importRegex =
    /import\s+(?:(\*)\s+as\s+(\w+)|(\w+)(?:\s*,\s*)?|\{([^}]+)\})\s+from\s+['"]([^'"]+)['"]/g;

  let match;

  while ((match = importRegex.exec(code)) !== null) {
    const line = getLineNumber(code, match.index);

    const identifiers: Array<{ name: string; alias?: string }> = [];
    let isDefault = false;
    let isNamespace = false;

    if (match[1] === "*") {
      isNamespace = true;
      identifiers.push({ name: "*", alias: match[2] });
    } else if (match[3] && !match[4]) {
      isDefault = true;
      identifiers.push({ name: match[3] });
    } else if (match[4]) {
      const items = match[4].split(",");
      for (const item of items) {
        const parts = item.trim().split(/\s+as\s+/);
        if (parts.length === 2) {
          identifiers.push({ name: parts[0].trim(), alias: parts[1].trim() });
        } else {
          identifiers.push({ name: parts[0].trim() });
        }
      }
    }

    if (match[3] && match[4]) {
      isDefault = true;
      identifiers.unshift({ name: match[3] });
    }

    results.push({
      source: match[5],
      identifiers,
      isDefault,
      isNamespace,
      filePath,
      line,
    });
  }

  return results;
}

/**
 * 解析导出语句
 */
function parseExports(code: string, filePath: string): ExportInfo[] {
  const results: ExportInfo[] = [];

  // export default
  const defaultExportRegex = /export\s+default\s+(\w+)/g;
  let match;
  while ((match = defaultExportRegex.exec(code)) !== null) {
    results.push({
      name: match[1],
      type: "default",
      filePath,
      line: getLineNumber(code, match.index),
    });
  }

  // export { ... }
  const namedExportRegex = /export\s+\{([^}]+)\}(?:\s+from\s+['"]([^'"]+)['"])?/g;
  while ((match = namedExportRegex.exec(code)) !== null) {
    const names = match[1].split(",").map((s) => s.trim().split(/\s+as\s+/)[0]);
    for (const name of names) {
      results.push({
        name,
        type: match[2] ? "reexport" : "named",
        source: match[2],
        filePath,
        line: getLineNumber(code, match.index),
      });
    }
  }

  // export * from 'module'
  const reexportAllRegex = /export\s+\*\s+from\s+['"]([^'"]+)['"]/g;
  while ((match = reexportAllRegex.exec(code)) !== null) {
    results.push({
      name: "*",
      type: "reexport",
      source: match[1],
      filePath,
      line: getLineNumber(code, match.index),
    });
  }

  return results;
}

/**
 * 创建 AST 解析器实例
 */
export function createParser(): ASTParser {
  return {
    async parseFile(filePath: string): Promise<ASTNode | null> {
      try {
        const file = Bun.file(filePath);
        const code = await file.text();
        return this.parseCode(code, filePath);
      } catch {
        return null;
      }
    },

    parseCode(code: string, filePath: string = "unknown"): ASTNode {
      const language = detectLanguage(filePath);
      const rootId = generateId();
      const children: ASTNode[] = [];

      const functions = parseFunctions(code, filePath);
      const classes = parseClasses(code, filePath);
      const interfaces = parseInterfaces(code, filePath);
      const imports = parseImports(code, filePath);
      const exports = parseExports(code, filePath);

      for (const { node } of functions) {
        node.parentId = rootId;
        children.push(node);
      }

      for (const { node } of classes) {
        node.parentId = rootId;
        children.push(node);
      }

      for (const { node } of interfaces) {
        node.parentId = rootId;
        children.push(node);
      }

      for (const imp of imports) {
        children.push({
          id: generateId(),
          type: "import_statement",
          name: imp.source,
          startLine: imp.line,
          startColumn: 1,
          endLine: imp.line,
          endColumn: 1,
          text: `import from '${imp.source}'`,
          children: [],
          parentId: rootId,
          filePath,
        });
      }

      for (const exp of exports) {
        children.push({
          id: generateId(),
          type: "export_statement",
          name: exp.name,
          startLine: exp.line,
          startColumn: 1,
          endLine: exp.line,
          endColumn: 1,
          text: `export ${exp.name}`,
          children: [],
          parentId: rootId,
          filePath,
        });
      }

      const lines = code.split("\n");

      return {
        id: rootId,
        type: "unknown",
        name: filePath.split("/").pop(),
        startLine: 1,
        startColumn: 1,
        endLine: lines.length,
        endColumn: lines[lines.length - 1].length + 1,
        text: code,
        children,
        filePath,
        properties: { language, totalLines: lines.length },
      };
    },

    getSupportedLanguages(): string[] {
      return ["typescript", "javascript", "tsx", "jsx"];
    },

    isLanguageSupported(filePath: string): boolean {
      return detectLanguage(filePath) !== "unknown";
    },
  };
}

export { parseFunctions, parseClasses, parseInterfaces, parseImports, parseExports };
