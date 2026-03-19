/**
 * look_at 工具
 * 提取文件结构，节省上下文
 */

import { z } from "zod";
import { readFile, stat } from "fs/promises";
import { extname, basename } from "path";
import { LIMITS, EXTRACTABLE_EXTENSIONS } from "../utils/config";

/** 提取类型 */
type ExtractType = "structure" | "imports" | "exports" | "all";

/** 工具输入 Schema */
export const lookAtSchema = {
  filePath: z.string().describe("要查看的文件路径"),
  extract: z
    .enum(["structure", "imports", "exports", "all"])
    .optional()
    .describe("提取类型：structure（结构）、imports（导入）、exports（导出）、all（全部）"),
};

/** 工具输入类型 */
export type LookAtInput = {
  filePath: string;
  extract?: "structure" | "imports" | "exports" | "signatures" | "all";
};

/** 提取 TypeScript/JavaScript 结构 */
function extractTypeScriptStructure(lines: string[]): string {
  const output: string[] = ["## 结构\n"];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (
      trimmed.startsWith("export ") ||
      trimmed.startsWith("class ") ||
      trimmed.startsWith("interface ") ||
      trimmed.startsWith("type ") ||
      trimmed.startsWith("function ") ||
      trimmed.startsWith("const ") ||
      trimmed.startsWith("async function ")
    ) {
      const signature =
        trimmed.length > LIMITS.maxSignatureLength
          ? `${trimmed.slice(0, LIMITS.maxSignatureLength)}...`
          : trimmed;
      output.push(`行 ${i + 1}: ${signature}`);
    }
  }

  return output.join("\n");
}

/** 提取 Python 结构 */
function extractPythonStructure(lines: string[]): string {
  const output: string[] = ["## 结构\n"];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (
      trimmed.startsWith("class ") ||
      trimmed.startsWith("def ") ||
      trimmed.startsWith("async def ") ||
      trimmed.startsWith("@")
    ) {
      const signature =
        trimmed.length > LIMITS.maxSignatureLength
          ? `${trimmed.slice(0, LIMITS.maxSignatureLength)}...`
          : trimmed;
      output.push(`行 ${i + 1}: ${signature}`);
    }
  }

  return output.join("\n");
}

/** 提取 Go 结构 */
function extractGoStructure(lines: string[]): string {
  const output: string[] = ["## 结构\n"];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (
      trimmed.startsWith("type ") ||
      trimmed.startsWith("func ") ||
      trimmed.startsWith("package ")
    ) {
      const signature =
        trimmed.length > LIMITS.maxSignatureLength
          ? `${trimmed.slice(0, LIMITS.maxSignatureLength)}...`
          : trimmed;
      output.push(`行 ${i + 1}: ${signature}`);
    }
  }

  return output.join("\n");
}

/** 提取 Markdown 结构 */
function extractMarkdownStructure(lines: string[]): string {
  const output: string[] = ["## 大纲\n"];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("#")) {
      output.push(`行 ${i + 1}: ${line}`);
    }
  }

  return output.join("\n");
}

/** 提取 JSON 结构 */
function extractJsonStructure(content: string): string {
  try {
    const obj = JSON.parse(content);
    const keys = Object.keys(obj);
    return `## 顶层键 (${keys.length})\n\n${keys.slice(0, 50).join(", ")}${keys.length > 50 ? "..." : ""}`;
  } catch {
    return "## 无效 JSON";
  }
}

/** 提取 YAML 结构 */
function extractYamlStructure(lines: string[]): string {
  const output: string[] = ["## 顶层键\n"];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.match(/^[a-zA-Z_][a-zA-Z0-9_]*:/)) {
      output.push(`行 ${i + 1}: ${line}`);
    }
  }

  return output.join("\n");
}

/** 提取通用结构 */
function extractGenericStructure(lines: string[]): string {
  const total = lines.length;
  const preview = lines.slice(0, 10).join("\n");
  const tail = lines.slice(-5).join("\n");

  return `## 文件预览 (${total} 行)\n\n### 前 10 行:\n${preview}\n\n### 后 5 行:\n${tail}`;
}

/** 根据扩展名提取结构 */
function extractStructure(content: string, ext: string): string {
  const lines = content.split("\n");

  switch (ext) {
    case ".ts":
    case ".tsx":
    case ".js":
    case ".jsx":
      return extractTypeScriptStructure(lines);
    case ".py":
      return extractPythonStructure(lines);
    case ".go":
      return extractGoStructure(lines);
    case ".md":
      return extractMarkdownStructure(lines);
    case ".json":
      return extractJsonStructure(content);
    case ".yaml":
    case ".yml":
      return extractYamlStructure(lines);
    default:
      return extractGenericStructure(lines);
  }
}

/** 执行 look_at 工具 */
export async function executeLookAt(input: LookAtInput): Promise<string> {
  try {
    const stats = await stat(input.filePath);
    const ext = extname(input.filePath).toLowerCase();
    const name = basename(input.filePath);

    const content = await readFile(input.filePath, "utf-8");
    const lines = content.split("\n");

    // 小文件直接返回全部内容
    if (
      stats.size < LIMITS.largeFileThreshold &&
      lines.length <= LIMITS.maxLinesWithoutExtract
    ) {
      return `## ${name} (${lines.length} 行)\n\n${content}`;
    }

    // 大文件提取结构
    let output = `## ${name}\n`;
    output += `**大小**: ${Math.round(stats.size / 1024)}KB | **行数**: ${lines.length}\n\n`;

    if (EXTRACTABLE_EXTENSIONS.includes(ext as (typeof EXTRACTABLE_EXTENSIONS)[number])) {
      output += extractStructure(content, ext);
    } else {
      output += extractGenericStructure(lines);
    }

    output += `\n\n---\n*使用 Read 工具的 line offset/limit 参数查看特定部分*`;

    return output;
  } catch (error) {
    return `错误: ${error instanceof Error ? error.message : String(error)}`;
  }
}
