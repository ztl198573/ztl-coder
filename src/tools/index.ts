/**
 * Tools barrel export
 */
export { lookAtSchema, executeLookAt, type LookAtInput } from "./look-at";
export {
  artifactSearchSchema,
  executeArtifactSearch,
  type ArtifactSearchInput,
} from "./artifact-search";
export { loadLedgerSchema, executeLoadLedger, type LoadLedgerInput } from "./ledger-loader";
export {
  astGrepSearchSchema,
  executeAstGrepSearch,
  type AstGrepSearchInput,
} from "./ast-grep-search";
export {
  astGrepReplaceSchema,
  executeAstGrepReplace,
  type AstGrepReplaceInput,
} from "./ast-grep-replace";
export {
  ptySpawnSchema,
  executePtySpawn,
  type PtySpawnInput,
} from "./pty-manager";
export {
  ptyWriteSchema,
  executePtyWrite,
  type PtyWriteInput,
} from "./pty-manager";
export {
  ptyReadSchema,
  executePtyRead,
  type PtyReadInput,
} from "./pty-manager";
export {
  ptyListSchema,
  executePtyList,
  type PtyListInput,
} from "./pty-manager";
export {
  ptyKillSchema,
  executePtyKill,
  type PtyKillInput,
} from "./pty-manager";

// Phase 1: 基础标准化工具
export {
  askUserQuestionSchema,
  executeAskUserQuestion,
  createConfirmQuestion,
  createScopeQuestion,
  createFixConfirmQuestion,
  type AskUserQuestionInput,
} from "./ask-user-question";
export {
  preambleSchema,
  executePreamble,
  shouldPromptTelemetry,
  markTelemetryPrompted,
  setTelemetryStatus,
  type PreambleInput,
  type PreambleOutput,
} from "./preamble";
export {
  fixFirstReviewSchema,
  executeFixFirstReview,
  isAutoFixable,
  generateConfirmationQuestion,
  createIssue,
  type FixFirstReviewInput,
  type ReviewIssue,
  type ReviewResult,
  type IssueSeverity,
  type IssueCategory,
} from "./fix-first-review";

// Phase 2: 性能优化
export {
  DaemonManager,
  codeIndexDaemon,
  astCacheDaemon,
  type DaemonConfig,
  type DaemonState,
  type DaemonHealth,
} from "../daemon/daemon-manager";
export {
  refSchema,
  createRef,
  createRefs,
  getRef,
  getRefOrThrow,
  parseRefId,
  extractRefIds,
  isRefValid,
  cleanExpiredRefs,
  clearAllRefs,
  formatRef,
  formatRefs,
  createRefsFromAstResults,
  type Ref,
  type RefType,
} from "./ref-system";
export {
  READ_TOOLS,
  WRITE_TOOLS,
  META_TOOLS,
  TOOL_DESCRIPTIONS,
  ToolRegistry,
  toolRegistry,
  type ToolMeta,
} from "./registry";

// Phase 3: 高级功能
export {
  skillFrontmatterSchema,
  parseFrontmatter,
  parseTemplateVariables,
  renderTemplate,
  SkillManager,
  skillManager,
  generateSkillTemplate,
  generateSkillFile,
  type SkillFrontmatter,
  type Skill,
  type SkillTemplateOptions,
} from "../skills/skill-template";

// Phase 4: gstack 合并工具
export {
  freezeTool,
  unfreezeTool,
  checkPermissionTool,
  getFreezeState,
  canEdit,
  freezeTools,
} from "./freeze";

// 浏览器工具
export {
  startBrowser,
  closeBrowser,
  getCurrentPage,
  isBrowserRunning,
  saveSession,
  loadSession,
  listSessions,
  deleteSession,
  getCurrentSessionId,
} from "./browse/manager";

export {
  goto,
  goBack,
  goForward,
  reload,
  getCurrentUrl,
  getTitle,
  setViewport,
  setMobileViewport,
  setDesktopViewport,
  setTabletViewport,
} from "./browse/navigation";

export {
  click,
  fill,
  select,
  check,
  uncheck,
  hover,
  press,
  type,
  waitForSelector,
  waitForText,
} from "./browse/interaction";

export {
  getSnapshot,
  takeScreenshot,
  getText,
  getHtml,
  getLinks,
  evaluate,
  type PageSnapshot,
} from "./browse/snapshot";

export {
  getCookies,
  getCookiesByDomain,
  setCookie,
  deleteCookie,
  clearAllCookies,
  exportCookies,
  importCookies,
  getNetscapeCookies,
} from "./browse/cookies";

export {
  initNetworkMonitoring,
  getNetworkRequests,
  getConsoleMessages,
  getErrors,
  clearNetworkRecords,
  clearConsoleRecords,
  getNetworkStats,
  type NetworkRequest,
  type ConsoleMessage,
} from "./browse/network";

// 调用链追踪
export {
  generateTraceId,
  generateSpanId,
  getActiveContext,
  setActiveContext,
  createRootContext,
  createChildContext,
  logSpan,
  endSpan,
  spanError,
  withTrace,
  withChildSpan,
  formatTraceContext,
  generateTraceReport,
  type TraceContext,
  type SpanEvent,
} from "../utils/tracing";
