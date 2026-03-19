/**
 * BTCA-Ask 工具
 * 使用 btca CLI 进行库源代码问答
 */

import { z } from "zod";
import { spawn } from "node:child_process";
import { log } from "../utils/logger";
import { extractErrorMessage } from "../utils/errors";

/** 工具 Schema */
export const btcaAskSchema = {
  question: z.string().describe("问题"),
  libraryName: z.string().describe("库名或包名"),
  context: z.string().optional().describe("额外上下文"),
  maxTokens: z.number().optional().default(2000).describe("最大 token 数"),
};

/** 工具输入类型 */
export type BtcaAskInput = {
  question: string;
  libraryName: string;
  context?: string;
  maxTokens?: number;
};

/** 获取 btca 命令前缀 */
function getBtcaCommand(): string[] {
  return ["npx", "-y", "btca-cli@latest"];
}

/**
 * 执行 BTCA 询问
 */
export async function executeBtcaAsk(
  input: BtcaAskInput
): Promise<string> {
  const { question, libraryName, context } = input;

  // 使用 npx 运行 btca
  const cmdArgs = [...getBtcaCommand(), "ask", question, "--library", libraryName];
  if (context) {
    cmdArgs.push("--context", context);
  }

  log.info("btca-ask", `执行查询: ${cmdArgs.join(" ")}`);

  return new Promise((resolve) => {
    const proc = spawn(cmdArgs[0], cmdArgs.slice(1), {
      cwd: process.cwd(),
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
        const output = stdout || stderr;
        resolve(formatBtcaResult(output));
      } else {
        resolve(`查询失败: ${stderr || stdout}`);
      }
    });

    proc.on("error", (error) => {
      resolve(`执行错误: ${extractErrorMessage(error)}`);
    });
  });
}

/** 格式化 BTCA 结果 */
function formatBtcaResult(output: string): string {
  if (!output.trim()) {
    return "未找到相关结果";
  }

  const lines = output.split("\n");
  const results: string[] = ["## BTCA 查询结果\n"];

  for (const line of lines) {
    if (line.trim()) {
      results.push(line);
    }
  }

  results.push(`\n共 ${lines.length} 行结果`);
  return results.join("\n");
}
