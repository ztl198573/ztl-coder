/**
 * ast_grep_search 工具
 * 使用 ast-grep 进行结构化代码搜索
 */

import { z } from "zod";
import { spawn } from "child_process";
import { log } from "../utils/logger";
import { extractErrorMessage } from "../utils/errors";

/** 工具输入 Schema */
export const astGrepSearchSchema = {
  pattern: z.string().describe("AST 模式，使用 $VAR 作为通配符"),
  language: z
    .enum(["typescript", "tsx", "javascript", "jsx", "python", "go", "rust", "java"])
    .optional()
    .describe("编程语言"),
  paths: z.array(z.string()).optional().describe("搜索路径，默认当前目录"),
  strictness: z
    .enum(["strict", "smart", "relaxed", "ast", "signature"])
    .optional()
    .describe("匹配严格程度"),
};

/** 工具输入类型 */
export type AstGrepSearchInput = {
  pattern: string;
  language?: "typescript" | "tsx" | "javascript" | "jsx" | "python" | "go" | "rust" | "java";
  paths?: string[];
  strictness?: "strict" | "smart" | "relaxed" | "ast" | "signature";
};

/** 匹配结果 */
interface MatchResult {
  file: string;
  line: number;
  column: number;
  text: string;
  matchedNode: string;
}

/** 执行 ast-grep 搜索 */
async function runAstGrep(input: AstGrepSearchInput): Promise<MatchResult[]> {
  const args = ["sg", "run"];

  // 添加模式
  args.push("--pattern", input.pattern);

  // 添加语言
  if (input.language) {
    args.push("--lang", input.language);
  }

  // 添加严格程度
  if (input.strictness) {
    args.push("--strictness", input.strictness);
  }

  // 添加路径
  if (input.paths && input.paths.length > 0) {
    args.push(...input.paths);
  } else {
    args.push(".");
  }

  // 添加 JSON 输出格式
  args.push("--json");

  return new Promise((resolve, reject) => {
    const childProcess = spawn("npx", args, {
      cwd: process.cwd(),
      shell: true,
    });

    let stdout = "";
    let stderr = "";

    childProcess.stdout.on("data", (data: Buffer) => {
      stdout += data.toString();
    });

    childProcess.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    childProcess.on("close", (code: number | null) => {
      if (code !== 0 && !stdout) {
        reject(new Error(`ast-grep failed: ${stderr}`));
        return;
      }

      try {
        // 解析 JSON 输出
        const results = JSON.parse(stdout);
        const matches: MatchResult[] = [];

        for (const result of results) {
          matches.push({
            file: result.file,
            line: result.range.start.line + 1,
            column: result.range.start.column + 1,
            text: result.text,
            matchedNode: result.text,
          });
        }

        resolve(matches);
      } catch {
        // 如果无法解析 JSON，返回空结果
        resolve([]);
      }
    });

    process.on("error", (error) => {
      reject(error);
    });
  });
}

/** 执行 ast_grep_search 工具 */
export async function executeAstGrepSearch(input: AstGrepSearchInput): Promise<string> {
  try {
    log.info(`AST 搜索: ${input.pattern}`, { operation: "ast_grep_search" });

    const matches = await runAstGrep(input);

    if (matches.length === 0) {
      return `未找到匹配: "${input.pattern}"`;
    }

    // 格式化输出
    const output: string[] = [
      `## AST 搜索结果: "${input.pattern}"`,
      "",
      `找到 ${matches.length} 个匹配`,
      "",
    ];

    // 按文件分组
    const byFile = new Map<string, MatchResult[]>();
    for (const match of matches) {
      const existing = byFile.get(match.file) || [];
      existing.push(match);
      byFile.set(match.file, existing);
    }

    for (const [file, fileMatches] of byFile) {
      output.push(`### ${file}`);
      for (const match of fileMatches) {
        output.push(`- 行 ${match.line}:${match.column}`);
        output.push(`  \`\`\``);
        output.push(`  ${match.text.split("\n")[0]}`);
        output.push(`  \`\`\``);
      }
      output.push("");
    }

    return output.join("\n");
  } catch (error) {
    const message = extractErrorMessage(error);
    log.error(`AST 搜索失败: ${message}`, { operation: "ast_grep_search" });
    return `搜索失败: ${message}`;
  }
}
