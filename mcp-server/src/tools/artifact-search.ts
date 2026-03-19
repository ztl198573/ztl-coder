/**
 * artifact_search 工具
 * 搜索历史账本、计划、设计
 */

import { z } from "zod";
import { readdir, readFile } from "fs/promises";
import { join, basename } from "path";
import { PATHS, LIMITS } from "../utils/config";
import { extractErrorMessage } from "../utils/errors";

/** 搜索类型 */
type SearchType = "ledger" | "plan" | "design" | "all";

/** 搜索结果 */
interface SearchResult {
  filePath: string;
  fileName: string;
  type: string;
  relevance: number;
  snippet: string;
}

/** 工具输入 Schema */
export const artifactSearchSchema = {
  query: z.string().describe("搜索关键词"),
  type: z
    .enum(["ledger", "plan", "design", "all"])
    .optional()
    .describe("搜索类型：ledger（账本）、plan（计划）、design（设计）、all（全部）"),
};

/** 工具输入类型 */
export type ArtifactSearchInput = {
  query: string;
  type?: "ledger" | "plan" | "design" | "all";
};

/** 获取搜索目录 */
function getSearchDirectories(type: SearchType): Array<{ path: string; type: string }> {
  const dirs: Array<{ path: string; type: string }> = [];

  if (type === "ledger" || type === "all") {
    dirs.push({ path: PATHS.ledgerDir, type: "账本" });
  }
  if (type === "plan" || type === "all") {
    dirs.push({ path: PATHS.plansDir, type: "计划" });
  }
  if (type === "design" || type === "all") {
    dirs.push({ path: PATHS.designsDir, type: "设计" });
  }

  return dirs;
}

/** 计算相关性分数 */
function calculateRelevance(content: string, query: string): number {
  const lowerContent = content.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const queryWords = lowerQuery.split(/\s+/);

  let score = 0;
  for (const word of queryWords) {
    const regex = new RegExp(word, "gi");
    const matches = content.match(regex);
    if (matches) {
      score += matches.length;
    }
  }

  return score;
}

/** 提取摘要 */
function extractSnippet(content: string, query: string, maxLength = 200): string {
  const lowerContent = content.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const queryWords = lowerQuery.split(/\s+/);

  // 找到第一个匹配词的位置
  let bestIndex = -1;
  for (const word of queryWords) {
    const index = lowerContent.indexOf(word);
    if (index !== -1 && (bestIndex === -1 || index < bestIndex)) {
      bestIndex = index;
    }
  }

  if (bestIndex === -1) {
    // 没有匹配，返回开头
    return content.slice(0, maxLength) + (content.length > maxLength ? "..." : "");
  }

  // 从匹配位置前后提取
  const start = Math.max(0, bestIndex - 50);
  const end = Math.min(content.length, bestIndex + maxLength - 50);

  let snippet = content.slice(start, end);
  if (start > 0) snippet = "..." + snippet;
  if (end < content.length) snippet = snippet + "...";

  return snippet;
}

/** 搜索目录中的文件 */
async function searchDirectory(
  dirPath: string,
  type: string,
  query: string,
): Promise<SearchResult[]> {
  const results: SearchResult[] = [];

  try {
    const files = await readdir(dirPath);
    const mdFiles = files.filter((f) => f.endsWith(".md"));

    for (const file of mdFiles) {
      const filePath = join(dirPath, file);
      try {
        const content = await readFile(filePath, "utf-8");
        const relevance = calculateRelevance(content, query);

        if (relevance > 0) {
          results.push({
            filePath,
            fileName: file,
            type,
            relevance,
            snippet: extractSnippet(content, query),
          });
        }
      } catch {
        // 忽略无法读取的文件
      }
    }
  } catch {
    // 忽略无法读取的目录
  }

  return results;
}

/** 执行 artifact_search 工具 */
export async function executeArtifactSearch(input: ArtifactSearchInput): Promise<string> {
  const searchType: SearchType = input.type || "all";
  const dirs = getSearchDirectories(searchType);

  const allResults: SearchResult[] = [];

  for (const dir of dirs) {
    const results = await searchDirectory(dir.path, dir.type, input.query);
    allResults.push(...results);
  }

  // 按相关性排序并限制数量
  allResults.sort((a, b) => b.relevance - a.relevance);
  const topResults = allResults.slice(0, LIMITS.maxSearchResults);

  if (topResults.length === 0) {
    return `未找到与 "${input.query}" 相关的结果`;
  }

  // 格式化输出
  const output: string[] = [`## 搜索结果: "${input.query}"\n`];
  output.push(`找到 ${allResults.length} 个结果，显示前 ${topResults.length} 个\n`);

  for (const result of topResults) {
    const relevanceLabel =
      result.relevance >= 5 ? "高" : result.relevance >= 2 ? "中" : "低";
    output.push(`### ${result.fileName}`);
    output.push(`- 类型: ${result.type}`);
    output.push(`- 相关性: ${relevanceLabel} (${result.relevance} 个匹配)`);
    output.push(`- 路径: \`${result.filePath}\``);
    output.push(`- 摘要: ${result.snippet}\n`);
  }

  return output.join("\n");
}
