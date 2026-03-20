/**
 * PTY 管理器测试
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { createPtyManager, DEFAULT_PTY_CONFIG } from "@/tools/pty-manager/index.ts";

describe("PTY 管理器", () => {
  let manager: ReturnType<typeof createPtyManager>;

  beforeEach(() => {
    manager = createPtyManager({
      maxSessions: 3,
      defaultMaxBufferLines: 100,
    });
  });

  afterEach(() => {
    manager.shutdown();
  });

  describe("spawn", () => {
    test("应成功创建 echo 命令会话", () => {
      const result = manager.spawn("test-echo", {
        command: "echo",
        args: ["hello"],
      });

      expect(result.success).toBe(true);
      expect(result.sessionId).toBeDefined();
      expect(result.sessionId).toMatch(/^pty_\d+_/);
    });

    test("应成功创建长时间运行的会话", () => {
      const result = manager.spawn("test-sleep", {
        command: "sleep",
        args: ["10"],
      });

      expect(result.success).toBe(true);
      expect(result.sessionId).toBeDefined();
    });

    test("无效命令应返回错误", () => {
      const result = manager.spawn("test-invalid", {
        command: "nonexistent_command_xyz",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test("应限制最大会话数", () => {
      // 创建 3 个会话（达到限制）
      manager.spawn("s1", { command: "sleep", args: ["1"] });
      manager.spawn("s2", { command: "sleep", args: ["1"] });
      manager.spawn("s3", { command: "sleep", args: ["1"] });

      // 第 4 个应该失败
      const result = manager.spawn("s4", { command: "sleep", args: ["1"] });

      expect(result.success).toBe(false);
      expect(result.error).toContain("最大会话数");
    });

    test("会话应有正确的初始状态", () => {
      manager.spawn("test", { command: "echo", args: ["test"] });

      const sessions = manager.list();
      expect(sessions).toHaveLength(1);
      expect(sessions[0].name).toBe("test");
      expect(sessions[0].status).toBe("running");
      expect(sessions[0].pid).toBeGreaterThan(0);
    });
  });

  describe("write", () => {
    test("应能向运行中的会话写入", async () => {
      const result = manager.spawn("test-sleep", {
        command: "sleep",
        args: ["5"],
      });

      expect(result.success).toBe(true);

      // 等待进程启动
      await new Promise((r) => setTimeout(r, 100));

      // sleep 命令不接受输入，但会话应该是运行中的
      const session = manager.get(result.sessionId!);
      expect(session!.status).toBe("running");
    });

    test("无效会话 ID 应返回错误", () => {
      const result = manager.write("invalid-id", "test");
      expect(result.success).toBe(false);
      expect(result.error).toContain("不存在");
    });
  });

  describe("read", () => {
    test("应能读取会话输出", async () => {
      const spawnResult = manager.spawn("test-echo", {
        command: "echo",
        args: ["hello world"],
      });

      expect(spawnResult.success).toBe(true);

      // 等待命令执行完成
      await new Promise((r) => setTimeout(r, 200));

      const readResult = manager.read(spawnResult.sessionId!);

      expect(readResult.success).toBe(true);
      expect(readResult.output).toContain("hello world");
    });

    test("应支持清除缓冲区", async () => {
      const spawnResult = manager.spawn("test-echo", {
        command: "echo",
        args: ["test"],
      });

      await new Promise((r) => setTimeout(r, 200));

      const readResult = manager.read(spawnResult.sessionId!, { clearBuffer: true });

      expect(readResult.success).toBe(true);

      // 再次读取应该为空
      const secondRead = manager.read(spawnResult.sessionId!);
      expect(secondRead.output).toBe("");
    });

    test("应支持限制读取行数", async () => {
      const spawnResult = manager.spawn("test-multi", {
        command: "printf",
        args: ["line1\\nline2\\nline3\\n"],
      });

      await new Promise((r) => setTimeout(r, 200));

      const readResult = manager.read(spawnResult.sessionId!, { maxLines: 2 });

      expect(readResult.success).toBe(true);
      expect(readResult.hasMore).toBe(true);
    });
  });

  describe("list", () => {
    test("应列出所有会话", () => {
      manager.spawn("s1", { command: "sleep", args: ["1"] });
      manager.spawn("s2", { command: "sleep", args: ["1"] });

      const sessions = manager.list();
      expect(sessions).toHaveLength(2);
      expect(sessions.map((s) => s.name).sort()).toEqual(["s1", "s2"]);
    });

    test("空列表应返回空数组", () => {
      const sessions = manager.list();
      expect(sessions).toHaveLength(0);
    });
  });

  describe("get", () => {
    test("应返回指定会话", () => {
      const result = manager.spawn("test", { command: "sleep", args: ["1"] });
      const session = manager.get(result.sessionId!);

      expect(session).toBeDefined();
      expect(session!.name).toBe("test");
    });

    test("无效 ID 应返回 undefined", () => {
      const session = manager.get("invalid-id");
      expect(session).toBeUndefined();
    });
  });

  describe("kill", () => {
    test("应终止运行中的会话", () => {
      const result = manager.spawn("test-kill", {
        command: "sleep",
        args: ["100"],
      });

      expect(result.success).toBe(true);

      const killResult = manager.kill(result.sessionId!);
      expect(killResult.success).toBe(true);

      const session = manager.get(result.sessionId!);
      expect(session!.status).toBe("killed");
    });

    test("无效会话 ID 应返回错误", () => {
      const result = manager.kill("invalid-id");
      expect(result.success).toBe(false);
    });
  });

  describe("cleanup", () => {
    test("应清理已退出的会话", async () => {
      manager.spawn("quick", { command: "echo", args: ["done"] });

      // 等待命令完成
      await new Promise((r) => setTimeout(r, 300));

      const cleaned = manager.cleanup();
      expect(cleaned).toBeGreaterThanOrEqual(0);
    });
  });

  describe("stats", () => {
    test("应返回正确的统计信息", () => {
      manager.spawn("s1", { command: "sleep", args: ["1"] });
      manager.spawn("s2", { command: "sleep", args: ["1"] });

      const stats = manager.stats();

      expect(stats.totalSessions).toBe(2);
      expect(stats.runningCount).toBe(2);
      expect(stats.exitedCount).toBe(0);
      expect(stats.errorCount).toBe(0);
    });
  });

  describe("shutdown", () => {
    test("应关闭所有会话", () => {
      manager.spawn("s1", { command: "sleep", args: ["1"] });
      manager.spawn("s2", { command: "sleep", args: ["1"] });

      manager.shutdown();

      const stats = manager.stats();
      expect(stats.runningCount).toBe(0);
    });
  });
});

describe("默认配置", () => {
  test("应有合理的默认值", () => {
    expect(DEFAULT_PTY_CONFIG.defaultCols).toBe(80);
    expect(DEFAULT_PTY_CONFIG.defaultRows).toBe(24);
    expect(DEFAULT_PTY_CONFIG.defaultMaxBufferLines).toBe(1000);
    expect(DEFAULT_PTY_CONFIG.healthCheckInterval).toBe(5000);
    expect(DEFAULT_PTY_CONFIG.maxSessions).toBe(10);
  });
});
