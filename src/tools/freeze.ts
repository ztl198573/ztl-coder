/**
 * Freeze/Unfreeze 工具
 * 提供编辑范围锁定功能，限制文件修改范围
 */

import { z } from "zod";
import type { Tool } from "../types.js";
import { log } from "@/utils/logger.js";

// 锁定状态存储
interface FreezeState {
  frozen: boolean;
  scope: string[];
  level: "strict" | "moderate" | "loose";
  protectedPatterns: string[];
  temporaryOverride: boolean;
  overrideExpiry: number | null;
}

// 全局状态
let freezeState: FreezeState = {
  frozen: false,
  scope: [],
  level: "moderate",
  protectedPatterns: [
    ".git/*",
    ".env*",
    "*.key",
    "*.pem",
    "*.p12",
    "*.pfx",
    "secrets/*",
    "credentials/*",
    "*.secret",
  ],
  temporaryOverride: false,
  overrideExpiry: null,
};

// 默认保护目录
const DEFAULT_PROTECTED = [
  ".git",
  ".env",
  ".env.local",
  ".env.production",
  ".env.development",
  "node_modules",
];

/**
 * 检查路径是否匹配模式
 */
function matchPattern(path: string, pattern: string): boolean {
  const regex = pattern
    .replace(/\*/g, ".*")
    .replace(/\?/g, ".")
    .replace(/\//g, "\\/");
  return new RegExp(`^${regex}$`).test(path);
}

/**
 * 检查路径是否在保护范围内
 */
function isProtected(path: string): boolean {
  // 检查默认保护目录
  for (const protected_path of DEFAULT_PROTECTED) {
    if (path.startsWith(protected_path)) {
      return true;
    }
  }

  // 检查自定义保护模式
  for (const pattern of freezeState.protectedPatterns) {
    if (matchPattern(path, pattern)) {
      return true;
    }
  }

  return false;
}

/**
 * 检查路径是否在允许范围内
 */
function isInScope(path: string): boolean {
  if (!freezeState.frozen) {
    return true;
  }

  // 检查临时解锁
  if (freezeState.temporaryOverride) {
    if (
      freezeState.overrideExpiry &&
      Date.now() < freezeState.overrideExpiry
    ) {
      return true;
    }
    // 解锁过期
    freezeState.temporaryOverride = false;
    freezeState.overrideExpiry = null;
  }

  // 根据锁定级别检查
  switch (freezeState.level) {
    case "strict":
      // 严格模式：必须完全匹配
      return freezeState.scope.some((s) => path === s || path.startsWith(`${s}/`));

    case "moderate":
      // 适中模式：允许子目录
      return freezeState.scope.some((s) => path.startsWith(s));

    case "loose":
      // 宽松模式：只阻止保护目录
      return !isProtected(path);

    default:
      return false;
  }
}

/**
 * 冻结工具 Schema
 */
const freezeSchema = z.object({
  scope: z.array(z.string()).optional().describe("允许编辑的目录列表"),
  level: z.enum(["strict", "moderate", "loose"]).optional().describe("锁定级别"),
  protect: z.array(z.string()).optional().describe("额外保护的路径模式"),
});

/**
 * 解冻工具 Schema
 */
const unfreezeSchema = z.object({
  temporary: z.boolean().optional().describe("是否临时解锁"),
  duration: z.number().optional().describe("临时解锁持续时间（秒）"),
});

/**
 * 检查权限 Schema
 */
const checkSchema = z.object({
  path: z.string().describe("要检查的文件路径"),
  operation: z.enum(["read", "write", "delete"]).optional().describe("操作类型"),
});

/**
 * 冻结工具
 */
export const freezeTool: Tool = {
  name: "ztl_code_freeze",
  description: `锁定编辑范围到指定目录

使用场景：
- 防止意外修改敏感文件
- 限制代码修改范围
- 保护生产环境配置

锁定级别：
- strict: 仅允许编辑指定目录，精确匹配
- moderate: 允许编辑指定目录及其子目录
- loose: 仅阻止敏感目录，其他可编辑

示例：
- ztl_code_freeze({ scope: ["src/"], level: "moderate" })
- ztl_code_freeze({ scope: ["src/", "tests/"], protect: ["*.secret"] })`,
  inputSchema: freezeSchema,
  execute: async (params: unknown) => {
    const args = freezeSchema.parse(params);

    // 更新状态
    freezeState.frozen = true;
    if (args.scope) {
      freezeState.scope = args.scope;
    }
    if (args.level) {
      freezeState.level = args.level;
    }
    if (args.protect) {
      freezeState.protectedPatterns = [
        ...freezeState.protectedPatterns,
        ...args.protect,
      ];
    }

    log.info("编辑范围已锁定", {
      scope: freezeState.scope,
      level: freezeState.level,
      protected: freezeState.protectedPatterns.length,
    });

    return {
      success: true,
      message: `编辑范围已锁定`,
      state: {
        frozen: freezeState.frozen,
        scope: freezeState.scope,
        level: freezeState.level,
        protectedCount: freezeState.protectedPatterns.length,
      },
    };
  },
};

/**
 * 解冻工具
 */
export const unfreezeTool: Tool = {
  name: "ztl_code_unfreeze",
  description: `解除编辑锁定

使用场景：
- 需要临时修改锁定范围外的文件
- 完成受限编辑后恢复完整权限

选项：
- temporary: 临时解锁，过期后自动恢复锁定
- duration: 临时解锁持续时间（秒），默认 300 秒

示例：
- ztl_code_unfreeze({}) - 永久解锁
- ztl_code_unfreeze({ temporary: true, duration: 60 }) - 临时解锁 1 分钟`,
  inputSchema: unfreezeSchema,
  execute: async (params: unknown) => {
    const args = unfreezeSchema.parse(params);

    if (args.temporary) {
      // 临时解锁
      const duration = args.duration ?? 300; // 默认 5 分钟
      freezeState.temporaryOverride = true;
      freezeState.overrideExpiry = Date.now() + duration * 1000;

      log.info("临时解锁编辑范围", { duration });

      return {
        success: true,
        message: `临时解锁 ${duration} 秒`,
        temporary: true,
        expiresAt: new Date(freezeState.overrideExpiry).toISOString(),
      };
    } else {
      // 永久解锁
      freezeState.frozen = false;
      freezeState.scope = [];
      freezeState.temporaryOverride = false;
      freezeState.overrideExpiry = null;

      log.info("编辑范围已解锁");

      return {
        success: true,
        message: "编辑范围已完全解锁",
        temporary: false,
      };
    }
  },
};

/**
 * 权限检查工具
 */
export const checkPermissionTool: Tool = {
  name: "ztl_code_check_permission",
  description: `检查文件操作是否被允许

使用场景：
- 在执行编辑操作前检查权限
- 验证文件是否在保护范围内

返回：
- allowed: 是否允许操作
- reason: 原因说明
- scope: 当前锁定范围`,
  inputSchema: checkSchema,
  execute: async (params: unknown) => {
    const args = checkSchema.parse(params);
    const operation = args.operation ?? "write";

    // 读取操作总是允许
    if (operation === "read") {
      return {
        allowed: true,
        path: args.path,
        operation,
        reason: "读取操作不受限制",
        scope: freezeState.frozen ? freezeState.scope : null,
      };
    }

    // 检查是否在保护范围
    if (isProtected(args.path)) {
      return {
        allowed: false,
        path: args.path,
        operation,
        reason: "文件在保护范围内",
        scope: freezeState.scope,
        level: freezeState.level,
      };
    }

    // 检查是否在锁定范围内
    if (!isInScope(args.path)) {
      return {
        allowed: false,
        path: args.path,
        operation,
        reason: "文件在锁定范围外",
        scope: freezeState.scope,
        level: freezeState.level,
      };
    }

    return {
      allowed: true,
      path: args.path,
      operation,
      reason: freezeState.frozen
        ? "文件在允许范围内"
        : "未启用锁定，所有文件可编辑",
      scope: freezeState.frozen ? freezeState.scope : null,
    };
  },
};

/**
 * 获取当前锁定状态
 */
export function getFreezeState(): FreezeState {
  return { ...freezeState };
}

/**
 * 检查路径是否可编辑（供其他工具使用）
 */
export function canEdit(path: string): { allowed: boolean; reason: string } {
  if (!freezeState.frozen) {
    return { allowed: true, reason: "未启用锁定" };
  }

  if (isProtected(path)) {
    return { allowed: false, reason: "文件在保护范围内" };
  }

  if (!isInScope(path)) {
    return {
      allowed: false,
      reason: `文件不在锁定范围内。允许范围: ${freezeState.scope.join(", ")}`,
    };
  }

  return { allowed: true, reason: "文件在允许范围内" };
}

// 导出工具
export const freezeTools = [freezeTool, unfreezeTool, checkPermissionTool];
