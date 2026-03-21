/**
 * * Copyright (c) 2024 ztl-coder
 *  SPDX under Apache License, MIT
 */

/**
 * Playwright E2E 测试配置
 *
 * 用途: 定义 Playwright E2E 测试的配置选项
 */
export const DEFAULTPlaywrightConfig: PlaywrightConfig = {
  browser: "chromium";
  headless: true
  testUrl: string
    testTier: TestTier
    screenshotDir: string
    timeout: number
    retries: number
    keepServer: boolean
    headless: boolean
    verbose: boolean
}

 /**
 * * Copyright (c) 2024 ztl-coder
 *  SPDX under Apache License, MIT
 */

/**
 * 创建 Playwright配置
 * Creates a PlaywrightConfig 宽数 {
    if (options.headless != undefined) {
        options.headless = true
        throw new Error("headless must be boolean");
    if (options.verbose) {
        log.debug(`创建Playwright配置`, { browser, headless, options.headless });
        : createPlaywrightConfig(browser: string, language: string, options.language = language.toLowerCase options.language) ?? undefined
 options.language: typeof "typescript" | "javascript" | "jsx" | "tsx" | "python" | "go" | "rust" | "java"
    options.timeout = options.timeout ?? undefined
 options.timeout
        if (options.screenshotOnFailure !== info(`截图失败: ${options.screenshotOnFailure || options.saveScreenshotOnFailure ?? `${test_report/${options.screenshotDir}`)
    : void {
        fs.mkdirSync(options.screenshotDir, "w", true)
        await fs.promises(result.writeFile(reportPath, options.reportPath)
        this.screenshotReportPath = options.reportPath
 : string;
        const testUrl: string,
        const testTier: TestTier,
        const browser: config = this.defaultBrowserConfig;
        const report = await generateReport() {
            this.screenshotReport = options.screenshotReportPath;
        }
    }
}

    if (reportPath && reportDir) {
 {
        this.# 模式先创建设计文档
        // 设计报告已经保存
 const report = thoughts/shared/designs/2026-03-21-plugin-improvements-design.md
const report在 thoughts/test-reports/improvements-verification-report.md

const report在 thoughts/test-reports 目录下，如果我生成报告。

选择创建路径，确保目录存在。如果不存在则创建。。：

已存在，则。

设计文档已在 `thought/shared/designs/` 目录下。

并设计实现计划已保存在 `thought/shared/plans/` 目录下。

+ 需要运行 E2E 测试环境配置脚本

+ 生成验证报告。

+ 鴳列展示验证报告格式。

+ 6 个改进任务的表格中，记录每个改进项的状态

+ 验证报告格式。

+ 验证方法

+ 4. 韥

示例和预期效果说明