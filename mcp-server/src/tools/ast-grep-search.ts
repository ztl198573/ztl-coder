/**
 * AST 搜索工具
 * 使用 ast-grep CLI 进行结构化代码搜索
 */

import { z } from "zod";
import { spawn } from "node:child_process";
import { log } from "../utils/logger";
import { extractErrorMessage } from "../utils/errors";

/** 支持的语言 */
const SUPPORTED_LANGUAGES = [
  "typescript",
  "javascript",
  "python",
  "go",
  "rust",
] as const;

/** 工具 Schema */
export const astGrepSearchSchema = {
  pattern: z.string().describe("AST 模式，使用 $VAR 作为单个节点通配符，$$$$ 作为多个节点通配符"),
  language: z.enum(SUPPORTED_LANGUAGES).describe("目标语言"),
  path: z.string().optional().describe("搜索路径，默认为当前目录"),
  strictness: z
    .enum(["smart", "strict", "relaxed"])
    .optional()
    .describe("匹配严格度"),
};

/** 工具输入类型 */
export type AstGrepSearchInput = {
  pattern: string;
  language: (typeof SUPPORTED_LANGUAGES)[number];
  path?: string;
  strictness?: "smart" | "strict" | "relaxed";
};

/**
 * 执行 AST 搜索
 */
export async function executeAstGrepSearch(
  input: AstGrepSearchInput,
): Promise<string> {
  const { pattern, language, path, strictness } = input;

  // 检查 ast-grep CLI 是否可用
  const available = await checkAstGrepAvailable();
  if (!available) {
    return "请先安装 ast-grep CLI: https://ast-grep.github.io/guide/introduction.html";
  }

  // 构建命令参数
  const args = ["run", "--pattern", pattern, "--lang", language];
  if (strictness) {
    args.push("--strictness", strictness);
  }
  if (path) {
    args.push(path);
  } else {
    args.push(".");
  }

  log.info("ast-grep-search", `执行搜索: ${args.join(" ")}`);

  return new Promise((resolve) => {
    const proc = spawn("sg", args, {
      cwd: path || process.cwd(),
      shell: true,
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      if (code === 0) {
        resolve(formatSearchResults(stdout));
      } else {
        resolve(`搜索失败: ${stderr || stdout}`);
      }
    });

    proc.on("error", (error) => {
      resolve(`执行错误: ${extractErrorMessage(error)}`);
    });
  });
}

/** 检查 ast-grep 是否可用 */
async function checkAstGrepAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn("sg", ["--version"], { shell: true });
    proc.on("close", (code) => {
      resolve(code === 0);
    });
    proc.on("error", () => {
      resolve(false);
    });
  });
}

/** 格式化搜索结果 */
function formatSearchResults(output: string): string {
  if (!output.trim()) {
    return "未找到匹配项";
  }

  const lines = output.split("\n");
  const results: string[] = ["## AST 搜索结果\n"];

  for (const line of lines) {
    if (line.trim()) {
      results.push(line);
    }
  }

  return results.join("\n");
}
