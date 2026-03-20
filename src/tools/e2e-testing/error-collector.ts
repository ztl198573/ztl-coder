/**
 * 错误收集器
 *
 * 聚合和分类浏览器会话中收集的错误
 */

import type {
  BrowserType,
  CollectedError,
  ErrorReport,
  ErrorReportSummary,
  ErrorType,
  ErrorSeverity,
} from "./types.ts";

/** 生成唯一 ID */
function generateId(prefix: string = "id"): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * 创建错误收集器
 */
export function createErrorCollector() {
  const errors: CollectedError[] = [];

  /** 添加错误 */
  function addError(partial: Partial<CollectedError>): CollectedError {
    const error: CollectedError = {
      id: generateId("err"),
      type: partial.type || "runtime",
      severity: partial.severity || "error",
      message: partial.message || "",
      timestamp: new Date(),
      ...partial,
    };
    errors.push(error);
    return error;
  }

  /** 批量添加错误 */
  function addErrors(newErrors: Partial<CollectedError>[]): void {
    for (const partial of newErrors) {
      addError(partial);
    }
  }

  /** 获取所有错误 */
  function getErrors(): CollectedError[] {
    return [...errors];
  }

  /** 按类型过滤 */
  function filterByType(type: ErrorType): CollectedError[] {
    return errors.filter((e) => e.type === type);
  }

  /** 按严重程度过滤 */
  function filterBySeverity(severity: ErrorSeverity): CollectedError[] {
    return errors.filter((e) => e.severity === severity);
  }

  /** 获取错误（排除指定类型） */
  function excludeTypes(types: ErrorType[]): CollectedError[] {
    return errors.filter((e) => !types.includes(e.type));
  }

  /** 生成摘要 */
  function generateSummary(): ErrorReportSummary {
    const summary: ErrorReportSummary = {
      total: errors.length,
      byType: {} as Record<ErrorType, number>,
      bySeverity: {} as Record<ErrorSeverity, number>,
    };

    for (const error of errors) {
      summary.byType[error.type] = (summary.byType[error.type] || 0) + 1;
      summary.bySeverity[error.severity] =
        (summary.bySeverity[error.severity] || 0) + 1;
    }

    return summary;
  }

  /** 生成修复建议 */
  function generateRecommendations(): string[] {
    const recommendations: string[] = [];

    // 按错误类型分组生成建议
    const consoleErrors = filterByType("console");
    const networkErrors = filterByType("network");
    const pageErrors = filterByType("pageerror");
    const runtimeErrors = filterByType("runtime");

    // Console 错误建议
    for (const error of consoleErrors) {
      if (error.message.includes("undefined")) {
        recommendations.push(
          `检查 ${error.location?.url || "未知位置"} 中的 undefined 值访问`,
        );
      }
      if (error.message.includes("null")) {
        recommendations.push(
          `检查 ${error.location?.url || "未知位置"} 中的 null 值访问`,
        );
      }
      if (error.message.includes("is not a function")) {
        recommendations.push(
          `验证 ${error.location?.url || "未知位置"} 中的函数调用是否正确`,
        );
      }
    }

    // 网络错误建议
    for (const error of networkErrors) {
      if (error.message.includes("404")) {
        recommendations.push(`检查资源路径是否正确: ${error.location?.url}`);
      }
      if (error.message.includes("500")) {
        recommendations.push(
          `检查服务器端错误: ${error.location?.url}，查看后端日志`,
        );
      }
      if (error.message.includes("CORS")) {
        recommendations.push(
          `配置 CORS 策略以允许跨域请求: ${error.location?.url}`,
        );
      }
      if (error.message.includes("timeout")) {
        recommendations.push(
          `增加请求超时时间或优化响应速度: ${error.location?.url}`,
        );
      }
    }

    // 页面错误建议
    for (const error of pageErrors) {
      if (error.stack) {
        // 从堆栈中提取文件名和行号
        const match = error.stack.match(/at\s+.*?\((.+?):(\d+):(\d+)\)/);
        if (match) {
          const [, file, line] = match;
          recommendations.push(`修复 ${file}:${line} 处的异常: ${error.message}`);
        } else {
          recommendations.push(`修复 JS 异常: ${error.message}`);
        }
      } else {
        recommendations.push(`修复 JS 异常: ${error.message}`);
      }
    }

    // 运行时错误建议
    for (const error of runtimeErrors) {
      recommendations.push(
        `检查运行时错误: ${error.message} (${error.location?.url || "未知位置"})`,
      );
    }

    // 去重
    return [...new Set(recommendations)];
  }

  /** 生成完整报告 */
  function generateReport(
    browserInfo?: { type: BrowserType; version: string },
    url?: string,
  ): ErrorReport {
    const summary = generateSummary();
    const recommendations = generateRecommendations();
    const screenshots = errors
      .filter((e) => e.screenshot)
      .map((e) => e.screenshot!);

    return {
      reportId: generateId("report"),
      timestamp: new Date(),
      browser: browserInfo || { type: "unknown", version: "unknown" },
      url: url || "",
      summary,
      errors: [...errors],
      screenshots,
      recommendations,
    };
  }

  /** 生成 Markdown 报告 */
  function generateMarkdownReport(
    browserInfo?: { type: BrowserType; version: string },
    url?: string,
  ): string {
    const report = generateReport(browserInfo, url);
    const lines: string[] = [];

    lines.push("# E2E 测试报告");
    lines.push("");
    lines.push(
      `**执行时间**: ${report.timestamp.toLocaleString("zh-CN")}`,
    );
    lines.push(
      `**浏览器**: ${report.browser.type} ${report.browser.version}`,
    );
    lines.push(`**页面**: ${report.url || "未知"}`);
    lines.push("");

    // 摘要表格
    lines.push("## 摘要");
    lines.push("");
    lines.push("| 类型 | 错误数 | 警告数 |");
    lines.push("|------|--------|--------|");

    const errorTypes: ErrorType[] = [
      "console",
      "network",
      "runtime",
      "pageerror",
    ];
    for (const type of errorTypes) {
      const typeErrors = filterByType(type).filter(
        (e) => e.severity === "error",
      ).length;
      const typeWarnings = filterByType(type).filter(
        (e) => e.severity === "warning",
      ).length;
      lines.push(`| ${type} | ${typeErrors} | ${typeWarnings} |`);
    }
    lines.push("");

    // 错误详情
    if (errors.length > 0) {
      lines.push("## 错误详情");
      lines.push("");

      for (const type of errorTypes) {
        const typeErrors = filterByType(type);
        if (typeErrors.length > 0) {
          lines.push(`### ${type} 错误 (${typeErrors.length})`);
          lines.push("");

          typeErrors.forEach((error, index) => {
            lines.push(`#### ${index + 1}. ${error.message.slice(0, 50)}...`);
            if (error.location) {
              lines.push(`- **位置**: ${error.location.url}`);
              if (error.location.line) {
                lines.push(
                  `  - 行: ${error.location.line}, 列: ${error.location.column}`,
                );
              }
            }
            lines.push(`- **严重程度**: ${error.severity}`);
            if (error.stack) {
              lines.push("- **堆栈**:");
              lines.push("```");
              lines.push(error.stack.slice(0, 500));
              lines.push("```");
            }
            lines.push("");
          });
        }
      }
    }

    // 修复建议
    const recommendations = generateRecommendations();
    if (recommendations.length > 0) {
      lines.push("## 修复建议");
      lines.push("");
      recommendations.forEach((rec, index) => {
        lines.push(`${index + 1}. ${rec}`);
      });
      lines.push("");
    }

    return lines.join("\n");
  }

  /** 生成 JSON 报告 */
  function generateJsonReport(
    browserInfo?: { type: BrowserType; version: string },
    url?: string,
  ): string {
    const report = generateReport(browserInfo, url);
    return JSON.stringify(report, null, 2);
  }

  /** 清除所有错误 */
  function clear(): void {
    errors.length = 0;
  }

  /** 获取错误数量 */
  function count(): number {
    return errors.length;
  }

  /** 是否有错误 */
  function hasErrors(): boolean {
    return errors.some((e) => e.severity === "error");
  }

  /** 是否有警告 */
  function hasWarnings(): boolean {
    return errors.some((e) => e.severity === "warning");
  }

  return {
    addError,
    addErrors,
    getErrors,
    filterByType,
    filterBySeverity,
    excludeTypes,
    generateSummary,
    generateRecommendations,
    generateReport,
    generateMarkdownReport,
    generateJsonReport,
    clear,
    count,
    hasErrors,
    hasWarnings,
  };
}

export type ErrorCollector = ReturnType<typeof createErrorCollector>;
