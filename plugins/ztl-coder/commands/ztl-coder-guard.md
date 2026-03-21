---
description: 安全模式，包含破坏性命令警告和编辑范围锁定
---

# 安全模式（Guard Mode）

启用安全模式，包含破坏性命令警告和编辑范围锁定功能。

## 功能说明

### 1. 破坏性命令警告（Careful）

检测并警告潜在的破坏性命令：

**监控的命令模式：**
- `rm -rf` - 递归删除
- `git push --force` - 强制推送
- `git reset --hard` - 硬重置
- `DROP TABLE` - 删除表
- `DELETE FROM` - 删除数据
- `TRUNCATE` - 清空表
- `:w !sudo tee` - 覆盖系统文件
- `chmod -R 777` - 危险权限
- `dd if=` - 磁盘写入
- `mkfs` - 格式化

### 2. 编辑范围锁定（Freeze）

限制文件编辑范围：

**锁定级别：**
- `strict` - 仅允许编辑指定目录
- `moderate` - 允许编辑指定目录及其子目录
- `loose` - 仅阻止敏感目录

**保护目录（默认）：**
- `.git/` - Git 仓库
- `.env*` - 环境变量
- `node_modules/` - 依赖
- `*.key` - 密钥文件
- `*.pem` - 证书文件

## 使用方式

### 启用安全模式

```
/ztl-coder-guard
```

默认配置：
- 破坏性命令警告：启用
- 编辑范围锁定：当前项目目录
- 锁定级别：moderate

### 自定义配置

```
/ztl-coder-guard --scope=src/ --level=strict
```

参数：
- `--scope` - 允许编辑的目录（可多个）
- `--level` - 锁定级别（strict/moderate/loose）
- `--protect` - 额外保护的目录

### 禁用安全模式

```
/ztl-coder-guard --off
```

## 配置示例

### 项目级配置

在 `CLAUDE.md` 中添加：

```markdown
## 安全模式配置

@guard:
  enabled: true
  level: moderate
  scope:
    - src/
    - tests/
    - docs/
  protect:
    - .env
    - config/secrets/
```

### 全局配置

在 `~/.claude/settings.json` 中添加：

```json
{
  "guard": {
    "enabled": true,
    "level": "moderate",
    "defaultScope": ["*"],
    "protectedPatterns": [
      ".git/*",
      ".env*",
      "*.key",
      "*.pem"
    ]
  }
}
```

## 警告示例

### 破坏性命令警告

```
⚠️ 安全警告：检测到破坏性命令

命令: rm -rf node_modules/
风险: 将删除 node_modules 目录及其所有内容
影响: 需要重新安装依赖（可能需要几分钟）

建议替代方案:
  - rm -rf node_modules/.cache  (仅清理缓存)
  - npx rimraf node_modules     (更安全的删除)

是否继续执行？[y/N]
```

### 编辑范围警告

```
⚠️ 编辑范围警告

尝试编辑: .env.production
锁定范围: src/, tests/
原因: 文件在锁定范围之外

此文件包含敏感配置。如需编辑：
1. 确认你有权限修改此文件
2. 使用 --override 参数临时解锁
3. 联系管理员获取权限

是否继续？[y/N]
```

## 安全规则

### 破坏性命令规则

1. **必须确认** - 所有破坏性命令需要用户确认
2. **显示影响** - 说明命令将做什么
3. **提供替代** - 建议更安全的替代方案
4. **记录日志** - 记录所有破坏性操作

### 编辑范围规则

1. **白名单模式** - 只允许编辑指定目录
2. **敏感保护** - 永久保护敏感文件
3. **临时解锁** - 支持 --override 临时解锁
4. **审计日志** - 记录所有解锁操作

## 日志记录

所有安全事件记录到 `thoughts/guard-log/`：

```markdown
# Guard Log - {date}

## 破坏性命令警告

| 时间 | 命令 | 风险 | 用户操作 |
|------|------|------|----------|
| 10:30 | rm -rf dist/ | 中 | 已确认 |
| 11:45 | git push --force | 高 | 已取消 |

## 编辑范围警告

| 时间 | 文件 | 锁定范围 | 用户操作 |
|------|------|----------|----------|
| 14:20 | .env | src/ | 已取消 |
| 15:30 | config/secrets.json | src/ | 临时解锁 |

## 临时解锁记录

| 时间 | 范围 | 原因 | 持续时间 |
|------|------|------|----------|
| 15:30 | config/ | 更新密钥 | 5分钟 |
```

## 与其他命令配合

### 与 /commit 配合

```bash
/ztl-coder-guard  # 先启用安全模式
/commit           # 安全提交
```

### 与 /review-pr 配合

```bash
/ztl-coder-guard --scope=src/  # 限制审查范围
/review-pr 123
```

## 注意事项

- 安全模式不影响读取操作
- 临时解锁需要明确确认
- 所有操作都有日志记录
- 生产环境建议始终启用
