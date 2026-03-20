/**
 * AST 搜索类型定义
 *
 * 基于简化的 AST 节点模型，不依赖外部库
 */

/** 节点类型 */
export type NodeType =
  | "function"
  | "function_declaration"
  | "function_expression"
  | "arrow_function"
  | "method_definition"
  | "class"
  | "class_declaration"
  | "interface"
  | "interface_declaration"
  | "type_alias"
  | "import"
  | "import_statement"
  | "export"
  | "export_statement"
  | "variable"
  | "variable_declaration"
  | "const_declaration"
  | "let_declaration"
  | "call_expression"
  | "member_expression"
  | "identifier"
  | "string"
  | "number"
  | "comment"
  | "jsx_element"
  | "jsx_attribute"
  | "property"
  | "method"
  | "parameter"
  | "return_statement"
  | "if_statement"
  | "for_statement"
  | "while_statement"
  | "try_statement"
  | "catch_clause"
  | "throw_statement"
  | "new_expression"
  | "await_expression"
  | "async_keyword"
  | "unknown";

/** AST 节点 */
export interface ASTNode {
  /** 节点 ID */
  id: string;
  /** 节点类型 */
  type: NodeType;
  /** 节点名称（如函数名、类名） */
  name?: string;
  /** 起始行 */
  startLine: number;
  /** 起始列 */
  startColumn: number;
  /** 结束行 */
  endLine: number;
  /** 结束列 */
  endColumn: number;
  /** 源代码文本 */
  text: string;
  /** 子节点 */
  children: ASTNode[];
  /** 父节点 ID */
  parentId?: string;
  /** 文件路径 */
  filePath: string;
  /** 额外属性 */
  properties?: Record<string, unknown>;
}

/** 搜索结果 */
export interface SearchResult {
  /** 文件路径 */
  filePath: string;
  /** 节点信息 */
  node: ASTNode;
  /** 上下文（前后几行） */
  context: string;
  /** 匹配类型 */
  matchType: "exact" | "pattern" | "semantic";
  /** 相关性分数 (0-1) */
  score: number;
}

/** 搜索选项 */
export interface SearchOptions {
  /** 要搜索的文件模式 */
  filePattern?: string;
  /** 节点类型过滤 */
  nodeTypes?: NodeType[];
  /** 是否包含子节点 */
  includeChildren?: boolean;
  /** 最大结果数 */
  maxResults?: number;
  /** 是否大小写敏感 */
  caseSensitive?: boolean;
  /** 上下文行数 */
  contextLines?: number;
}

/** 函数信息 */
export interface FunctionInfo {
  /** 函数名 */
  name: string;
  /** 文件路径 */
  filePath: string;
  /** 起始行 */
  startLine: number;
  /** 结束行 */
  endLine: number;
  /** 参数列表 */
  parameters: string[];
  /** 返回类型 */
  returnType?: string;
  /** 是否异步 */
  isAsync: boolean;
  /** 是否导出 */
  isExported: boolean;
  /** 是否为箭头函数 */
  isArrow: boolean;
  /** JSDoc 注释 */
  jsDoc?: string;
}

/** 类信息 */
export interface ClassInfo {
  /** 类名 */
  name: string;
  /** 文件路径 */
  filePath: string;
  /** 起始行 */
  startLine: number;
  /** 结束行 */
  endLine: number;
  /** 父类名 */
  extends?: string;
  /** 实现的接口 */
  implements: string[];
  /** 方法列表 */
  methods: string[];
  /** 属性列表 */
  properties: string[];
  /** 是否导出 */
  isExported: boolean;
  /** 是否为抽象类 */
  isAbstract: boolean;
}

/** 接口信息 */
export interface InterfaceInfo {
  /** 接口名 */
  name: string;
  /** 文件路径 */
  filePath: string;
  /** 起始行 */
  startLine: number;
  /** 结束行 */
  endLine: number;
  /** 继承的接口 */
  extends: string[];
  /** 方法签名 */
  methods: string[];
  /** 属性签名 */
  properties: string[];
  /** 是否导出 */
  isExported: boolean;
}

/** 调用关系 */
export interface CallRelation {
  /** 调用者 */
  caller: {
    name: string;
    filePath: string;
    line: number;
  };
  /** 被调用者 */
  callee: {
    name: string;
    filePath?: string;
    line?: number;
  };
  /** 调用位置 */
  location: {
    filePath: string;
    line: number;
    column: number;
  };
}

/** 导入信息 */
export interface ImportInfo {
  /** 源模块 */
  source: string;
  /** 导入的标识符 */
  identifiers: Array<{
    name: string;
    alias?: string;
  }>;
  /** 是否为默认导入 */
  isDefault: boolean;
  /** 是否为命名空间导入 */
  isNamespace: boolean;
  /** 文件路径 */
  filePath: string;
  /** 行号 */
  line: number;
}

/** 导出信息 */
export interface ExportInfo {
  /** 导出的标识符 */
  name: string;
  /** 导出类型 */
  type: "named" | "default" | "reexport";
  /** 源模块（用于 reexport） */
  source?: string;
  /** 文件路径 */
  filePath: string;
  /** 行号 */
  line: number;
}

/** 符号表 */
export interface SymbolTable {
  /** 函数列表 */
  functions: Map<string, FunctionInfo[]>;
  /** 类列表 */
  classes: Map<string, ClassInfo[]>;
  /** 接口列表 */
  interfaces: Map<string, InterfaceInfo[]>;
  /** 变量列表 */
  variables: Map<string, SearchResult[]>;
  /** 导入列表 */
  imports: ImportInfo[];
  /** 导出列表 */
  exports: ExportInfo[];
  /** 调用图 */
  callGraph: CallRelation[];
  /** 最后更新时间 */
  lastUpdated: Date;
}

/** AST 解析器接口 */
export interface ASTParser {
  /** 解析文件 */
  parseFile(filePath: string): Promise<ASTNode | null>;
  /** 解析代码字符串 */
  parseCode(code: string, filePath?: string): ASTNode;
  /** 获取支持的语言 */
  getSupportedLanguages(): string[];
  /** 检查是否支持该语言 */
  isLanguageSupported(filePath: string): boolean;
}

/** AST 搜索器接口 */
export interface ASTSearcher {
  /** 按名称搜索 */
  searchByName(name: string, options?: SearchOptions): Promise<SearchResult[]>;
  /** 按类型搜索 */
  searchByType(type: NodeType, options?: SearchOptions): Promise<SearchResult[]>;
  /** 按模式搜索 */
  searchByPattern(pattern: string, options?: SearchOptions): Promise<SearchResult[]>;
  /** 获取函数定义 */
  getFunctionDefinition(name: string): Promise<FunctionInfo | null>;
  /** 获取类定义 */
  getClassDefinition(name: string): Promise<ClassInfo | null>;
  /** 获取接口定义 */
  getInterfaceDefinition(name: string): Promise<InterfaceInfo | null>;
  /** 获取调用者 */
  getCallers(functionName: string): Promise<CallRelation[]>;
  /** 获取被调用函数 */
  getCallees(functionName: string): Promise<CallRelation[]>;
}
