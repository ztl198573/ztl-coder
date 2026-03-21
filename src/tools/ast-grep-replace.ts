/**
 * ast_grep_replace 工具
 * 基于 AST 的代码替换
 */

import { z } from "zod";
import { spawn } from "child_process";
import { log } from "../utils/logger";
import { extractErrorMessage } from "../utils/errors";

/** 工具输入 Schema */
export const astGrepReplaceSchema = {
  pattern: z.string().describe("要匹配的 AST 模式"),
  replacement: z.string().describe("替换模板"),
  language: z
    .enum(["typescript", "javascript", "tsx", "jsx", "python", "go", "rust", "java", "c", "cpp"])
    .optional()
    .describe("目标语言"),
  paths: z.array(z.string()).optional().describe("搜索路径"),
  dryRun: z.boolean().optional().describe("预览模式，不实际修改"),
};

/** 工具输入类型 */
export type AstGrepReplaceInput = {
  pattern: string;
  replacement: string;
  language?: "typescript" | "javascript" | "tsx" | "jsx" | "python" | "go" | "rust" | "java" | "c" | "cpp";
  paths?: string[];
  dryRun?: boolean;
};

/** 替换结果 */
interface ReplaceResult {
  file: string;
  line: number;
  column: number;
  oldText: string;
  newText: string;
}

/** 执行 ast-grep 替换 */
async function runAstGrepReplace(input: AstGrepReplaceInput): Promise<ReplaceResult[]> {
  const args = ["sg", "run"];

  // 添加模式
  args.push("--pattern", input.pattern);

  // 添加替换模板
  args.push("--rewrite", input.replacement);

  // 添加语言
  if (input.language) {
    args.push("--lang", input.language);
  }

  // 添加路径
  if (input.paths && input.paths.length > 0) {
    args.push(...input.paths);
  } else {
    args.push(".");
  }

  // 预览模式
  if (input.dryRun !== false) {
    args.push("--json");
  } else {
    args.push("--update-all");
  }

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
        reject(new Error(`ast-grep replace failed: ${stderr}`));
        return;
      }

      if (input.dryRun === false) {
        // 实际修改模式，返回成功消息
        resolve([]);
        return;
      }

      try {
        // 解析 JSON 输出
        const results = JSON.parse(stdout);
        const replacements: ReplaceResult[] = [];

        for (const result of results) {
          replacements.push({
            file: result.file,
            line: result.range.start.line + 1,
            column: result.range.start.column + 1,
            oldText: result.text,
            newText: result.text, // sg 不返回新文本，需要手动计算
          });
        }

        resolve(replacements);
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

/** 执行 ast_grep_replace 工具 */
export async function executeAstGrepReplace(input: AstGrepReplaceInput): Promise<string> {
  try {
    log.info(`AST 替换: ${input.pattern} → ${input.replacement}`, { operation: "ast_grep_replace" });

    if (input.dryRun !== false) {
      // 预览模式
      const results = await runAstGrepReplace({ ...input, dryRun: true });

      if (results.length === 0) {
        return `未找到可替换的匹配: "${input.pattern}"`;
      }

      // 格式化输出
      const output: string[] = [
        `## AST 替换预览: "${input.pattern}" → "${input.replacement}"`,
        "",
        `将影响 ${results.length} 处`,
        "",
        "**注意**: 这是预览模式。要实际执行替换，请设置 dryRun: false",
        "",
      ];

      for (const result of results) {
        output.push(`### ${result.file}:${result.line}`);
        output.push(`- 原始: \`${result.oldText.split("\n")[0]}\``);
        output.push("");
      }

      return output.join("\n");
    } else {
      // 实际执行替换
      await runAstGrepReplace({ ...input, dryRun: false });

      const output: string[] = [
        `## AST 替换完成: "${input.pattern}" → "${input.replacement}"`,
        "",
        "替换已执行。请检查修改后的文件。",
      ];

      return output.join("\n");
    }
  } catch (error) {
    const message = extractErrorMessage(error);
    log.error(`AST 替换失败: ${message}`, { operation: "ast_grep_replace" });
    return `替换失败: ${message}`;
  }
}
