/**
 * 浏览器工具系列
 * 提供统一的浏览器自动化能力
 *
 * 注意：playwright 是可选依赖
 * 如果没有安装，浏览器功能将不可用
 */

// 会话管理
export {
  startBrowser,
  closeBrowser,
  getCurrentPage,
  isBrowserRunning,
  isBrowserAvailable,
  saveSession,
  loadSession,
  listSessions,
  deleteSession,
  getCurrentSessionId,
} from "./manager.js";

// 导航工具
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
} from "./navigation.js";

// 交互工具
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
} from "./interaction.js";

// 快照工具
export {
  getSnapshot,
  takeScreenshot,
  getText,
  getHtml,
  getLinks,
  evaluate,
  type PageSnapshot,
} from "./snapshot.js";

// Cookie 管理
export {
  getCookies,
  getCookiesByDomain,
  setCookie,
  deleteCookie,
  clearAllCookies,
  exportCookies,
  importCookies,
  getNetscapeCookies,
} from "./cookies.js";

// 网络监控
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
} from "./network.js";
