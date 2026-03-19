/**
 * load_ledger 工具
 * 加载最新会话账本
 */

import { z } from "zod";
import { readdir, readFile, stat } from "fs/promises";
import { join } from "path";
import { PATHS } from "../utils/config";
import { isFileNotFoundError } from "../utils/errors";

/** 工具输入 Schema */
export const loadLedgerSchema = {};

/** 工具输入类型 */
export type LoadLedgerInput = Record<string, never>;

/** 账本信息 */
interface LedgerInfo {
  sessionName: string;
  filePath: string;
  content: string;
  mtime: Date;
}

/** 查找当前账本 */
async function findCurrentLedger(): Promise<LedgerInfo | null> {
  try {
    const files = await readdir(PATHS.ledgerDir);
    const ledgerFiles = files.filter(
      (f) => f.startsWith(PATHS.ledgerPrefix) && f.endsWith(".md"),
    );

    if (ledgerFiles.length === 0) return null;

    // 获取最近修改的账本
    let latestFile = ledgerFiles[0];
    let latestMtime = new Date(0);

    for (const file of ledgerFiles) {
      const filePath = join(PATHS.ledgerDir, file);
      try {
        const stats = await stat(filePath);
        if (stats.mtime > latestMtime) {
          latestMtime = stats.mtime;
          latestFile = file;
        }
      } catch {
        // 忽略无法访问的文件
      }
    }

    const filePath = join(PATHS.ledgerDir, latestFile);
    const content = await readFile(filePath, "utf-8");
    const sessionName = latestFile
      .replace(PATHS.ledgerPrefix, "")
      .replace(".md", "");

    return { sessionName, filePath, content, mtime: latestMtime };
  } catch (error) {
    if (isFileNotFoundError(error)) {
      return null;
    }
    throw error;
  }
}

/** 格式化账本注入 */
function formatLedgerInjection(ledger: LedgerInfo): string {
  return `<continuity-ledger session="${ledger.sessionName}">
${ledger.content}
</continuity-ledger>

你正在从之前的上下文清除中恢复工作。上面的账本包含你的会话状态。
请查看它并从你离开的地方继续。"Now" 项是你当前的焦点。`;
}

/** 执行 load_ledger 工具 */
export async function executeLoadLedger(_input: LoadLedgerInput): Promise<string> {
  const ledger = await findCurrentLedger();

  if (!ledger) {
    return `未找到会话账本。

创建新账本:
- 使用 /ztl-coder-ledger 命令
- 或手动创建 ${join(PATHS.ledgerDir, PATHS.ledgerPrefix)}{session-name}.md`;
  }

  const output: string[] = [
    `## 当前会话账本`,
    `- 会话: ${ledger.sessionName}`,
    `- 文件: ${ledger.filePath}`,
    `- 更新: ${ledger.mtime.toISOString()}`,
    "",
    "---",
    "",
    formatLedgerInjection(ledger),
  ];

  return output.join("\n");
}
