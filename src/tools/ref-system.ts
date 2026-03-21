/**
 * Ref 系统
 * 使搜索结果可引用，参考 gstack 的 Ref 模式
 */

import { z } from "zod";
import { log } from "../utils/logger";
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

// ============================================
// 类型定义
// ============================================

export const refSchema = z.object({
  id: z.string().describe("引用 ID，如 @n1"),
  type: z.enum([
    "function",
    "class",
    "interface",
    "variable",
    "import",
    "export",
    "type",
    "enum",
    "constant",
    "method",
    "property",
    "parameter",
    "call",
    "other",
  ]).describe("节点类型"),
  name: z.string().describe("节点名称"),
  file: z.string().describe("文件路径"),
  line: z.number().describe("行号"),
  column: z.number().optional().describe("列号"),
  endLine: z.number().optional().describe("结束行号"),
  snippet: z.string().optional().describe("代码片段"),
  metadata: z.record(z.unknown()).optional().describe("额外元数据"),
  createdAt: z.string().describe("创建时间"),
  expiresAt: z.string().optional().describe("过期时间"),
});

export type Ref = z.infer<typeof refSchema>;

export type RefType = Ref["type"];

// ============================================
// Ref 管理器
// ============================================

const REFS_DIR = join(homedir(), ".ztl-coder", "refs");
const REFS_FILE = join(REFS_DIR, "refs.json");

interface RefsStore {
  refs: Map<string, Ref>;
  lastId: number;
  projectRoot: string;
}

let store: RefsStore | null = null;

function initStore(): void {
  if (store) return;

  store = {
    refs: new Map(),
    lastId: 0,
    projectRoot: process.cwd(),
  };

  // 加载持久化的 refs
  if (existsSync(REFS_FILE)) {
    try {
      const data = JSON.parse(readFileSync(REFS_FILE, "utf-8"));
      if (data.refs && Array.isArray(data.refs)) {
        for (const ref of data.refs) {
          store.refs.set(ref.id, ref);
          // 更新 lastId
          const match = ref.id.match(/@n(\d+)/);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > store.lastId) {
              store.lastId = num;
            }
          }
        }
      }
      store.projectRoot = data.projectRoot || process.cwd();
    } catch {
      // 忽略加载错误
    }
  }
}

function persistStore(): void {
  if (!store) return;

  try {
    const data = {
      refs: Array.from(store.refs.values()),
      lastId: store.lastId,
      projectRoot: store.projectRoot,
      updatedAt: new Date().toISOString(),
    };

    const { mkdirSync } = require("node:fs");
    mkdirSync(REFS_DIR, { recursive: true });
    writeFileSync(REFS_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    log.warn("持久化 refs 失败", {
      operation: "ref_system",
      data: { error },
    });
  }
}

// ============================================
// 生成 Ref ID
// ============================================

function generateRefId(): string {
  if (!store) initStore();
  store!.lastId++;
  return `@n${store!.lastId}`;
}

// ============================================
// 创建 Ref
// ============================================

export function createRef(params: {
  type: RefType;
  name: string;
  file: string;
  line: number;
  column?: number;
  endLine?: number;
  snippet?: string;
  metadata?: Record<string, unknown>;
}): Ref {
  if (!store) initStore();

  const id = generateRefId();
  const ref: Ref = {
    id,
    type: params.type,
    name: params.name,
    file: params.file,
    line: params.line,
    column: params.column,
    endLine: params.endLine,
    snippet: params.snippet,
    metadata: params.metadata,
    createdAt: new Date().toISOString(),
  };

  store!.refs.set(id, ref);
  persistStore();

  log.info(`创建 Ref: ${id}`, {
    operation: "ref_create",
    data: { type: params.type, name: params.name },
  });

  return ref;
}

// ============================================
// 批量创建 Refs
// ============================================

export function createRefs(items: Array<{
  type: RefType;
  name: string;
  file: string;
  line: number;
  column?: number;
  endLine?: number;
  snippet?: string;
  metadata?: Record<string, unknown>;
}>): Ref[] {
  if (!store) initStore();

  const refs: Ref[] = [];
  for (const item of items) {
    refs.push(createRef(item));
  }

  return refs;
}

// ============================================
// 获取 Ref
// ============================================

export function getRef(id: string): Ref | undefined {
  if (!store) initStore();
  return store!.refs.get(id);
}

export function getRefOrThrow(id: string): Ref {
  const ref = getRef(id);
  if (!ref) {
    throw new Error(`Ref not found: ${id}`);
  }
  return ref;
}

// ============================================
// 解析 Ref ID
// ============================================

export function parseRefId(input: string): string | null {
  const match = input.match(/(@n\d+)/);
  return match ? match[1] : null;
}

export function extractRefIds(text: string): string[] {
  const matches = text.match(/@n\d+/g);
  return matches ? [...new Set(matches)] : [];
}

// ============================================
// 验证 Ref 有效性
// ============================================

export function isRefValid(id: string): boolean {
  const ref = getRef(id);
  if (!ref) return false;

  // 检查是否过期
  if (ref.expiresAt && new Date(ref.expiresAt) < new Date()) {
    return false;
  }

  return true;
}

// ============================================
// 清理过期 Refs
// ============================================

export function cleanExpiredRefs(): number {
  if (!store) initStore();

  const now = new Date();
  let cleaned = 0;

  for (const [id, ref] of store!.refs) {
    if (ref.expiresAt && new Date(ref.expiresAt) < now) {
      store!.refs.delete(id);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    persistStore();
    log.info(`清理过期 refs: ${cleaned}`, { operation: "ref_clean" });
  }

  return cleaned;
}

// ============================================
// 清除所有 Refs
// ============================================

export function clearAllRefs(): void {
  if (!store) initStore();
  store!.refs.clear();
  store!.lastId = 0;
  persistStore();
  log.info("清除所有 refs", { operation: "ref_clear" });
}

// ============================================
// 格式化 Ref 输出
// ============================================

export function formatRef(ref: Ref): string {
  const location = ref.column
    ? `${ref.file}:${ref.line}:${ref.column}`
    : `${ref.file}:${ref.line}`;

  let output = `${ref.id} [${ref.type}] "${ref.name}" at ${location}`;

  if (ref.snippet) {
    const lines = ref.snippet.split("\n").slice(0, 3);
    if (lines.length > 0) {
      output += `\n  ${lines.map((l) => `  ${l}`).join("\n")}`;
    }
  }

  return output;
}

export function formatRefs(refs: Ref[]): string {
  if (refs.length === 0) {
    return "No refs found";
  }

  return refs.map(formatRef).join("\n\n");
}

// ============================================
// 为 AST 搜索结果创建 Refs
// ============================================

export function createRefsFromAstResults(
  results: Array<{
    type: string;
    name: string;
    file: string;
    line: number;
    column?: number;
    text?: string;
  }>
): Ref[] {
  return createRefs(
    results.map((r) => ({
      type: mapAstTypeToRefType(r.type),
      name: r.name,
      file: r.file,
      line: r.line,
      column: r.column,
      snippet: r.text?.slice(0, 200),
    }))
  );
}

function mapAstTypeToRefType(astType: string): RefType {
  const mapping: Record<string, RefType> = {
    function_declaration: "function",
    function_expression: "function",
    method_definition: "method",
    class_declaration: "class",
    interface_declaration: "interface",
    type_alias_declaration: "type",
    enum_declaration: "enum",
    variable_declaration: "variable",
    import_statement: "import",
    export_statement: "export",
  };

  return mapping[astType] || "other";
}
