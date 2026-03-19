/**
 * AST 替换工具
 * 使用 ast-grep CLI 进行结构化代码替换
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
export const astGrepReplaceSchema = {
  pattern: z.string().describe("要匹配的 AST 模式"),
  replacement: z.string().describe("替换模式"),
  language: z.enum(SUPPORTED_LANGUAGES).describe("目标语言"),
  path: z.string().optional().describe("搜索路径"),
  dryRun: z.boolean().optional().describe("仅预览，不实际修改"),
};

/** 工具输入类型 */
export type AstGrepReplaceInput = {
  pattern: string;
  replacement: string;
  language: (typeof SUPPORTED_LANGUAGES)[number];
  path?: string;
  dryRun?: boolean;
};

/**
 * 执行 AST 替换
 */
export async function executeAstGrepReplace(
  input: AstGrepReplaceInput
): Promise<string> {
  const { pattern, replacement, language, path, dryRun = true } = input;

  // 检查 ast-grep CLI 是否可用
  const available = await checkAstGrepAvailable();
  if (!available) {
    return "请先安装 ast-grep CLI: https://ast-grep.github.io/guide/introduction.html";
  }

  // 构建命令参数
  const args = [
    "run",
    "--pattern", pattern,
    "--rewrite", replacement,
    "--lang", language,
  ];

  if (dryRun) {
    args.push("--json");
  } else {
    args.push("-U");
  }

  if (path) {
    args.push(path);
  } else {
    args.push(".");
  }

  log.info("ast-grep-replace", `执行替换: ${args.join(" ")}`);

  return new Promise((resolve) => {
    const proc = spawn("sg", args, {
      cwd: path || process.cwd(),
      shell: true
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
        if (dryRun) {
          resolve(formatDryRunResults(stdout));
        } else {
          resolve(`替换完成\n${stdout}`);
        }
      } else {
        resolve(`替换失败: ${stderr || stdout}`);
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

/** 格式化预览结果 */
function formatDryRunResults(output: string): string {
  if (!output.trim()) {
    return "未找到匹配项，无更改";
  }

  try {
    const results = JSON.parse(output);
    const lines: string[] = ["## 替换预览 (dry-run)\n"];
    lines.push("以下更改将被应用:\n");

    for (const result of results) {
      lines.push(`### ${result.file}`);
      lines.push(`行 ${result.range.start.line}:`);
      lines.push("```");
      lines.push(result.text);
      lines.push("```\n");
    }

    lines.push(`共 ${results.length} 处匹配`);
    lines.push("\n使用 dryRun: false 执行实际替换");

    return lines.join("\n");
  } catch {
    return `## 替换预览\n\n${output}\n\n使用 dryRun: false 执行实际替换`;
  }
}
