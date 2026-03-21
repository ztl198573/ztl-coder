---
description: 浏览器自动化命令入口，---

# 浏览器命令入口

提供统一的浏览器自动化命令入口，支持持久化浏览器会话。

## 功能概述

浏览器命令提供以下能力：
- 持久化浏览器会话
- 页面导航和截图
- 表单填写和点击
- 内容提取和验证
- 多标签页管理

## 基础命令

### 启动浏览器

```
/ztl-coder-browse start
```

启动一个持久化的浏览器会话。

### 导航到 URL

```
/ztl-coder-browse goto https://example.com
```

### 获取页面快照

```
/ztl-coder-browse snapshot
```

### 截图

```
/ztl-coder-browse screenshot [filename]
```

### 点击元素

```
/ztl-coder-browse click "登录按钮"
```

### 填写表单

```
/ztl-coder-browse fill "用户名输入框" "admin"
```

### 获取页面文本

```
/ztl-coder-browse text
```

### 获取页面链接

```
/ztl-coder-browse links
```

### 关闭浏览器

```
/ztl-coder-browse close
```

## 高级命令

### 执行脚本

```
/ztl-coder-browse eval "document.title"
```

### 等待元素

```
/ztl-coder-browse wait "提交按钮"
```

### 等待文本

```
/ztl-coder-browse wait-text "加载完成"
```

### 切换标签页

```
/ztl-coder-browse tab list
/ztl-coder-browse tab select 2
/ztl-coder-browse tab close 1
```

### 设置视口

```
/ztl-coder-browse viewport 1920 1080
```

### 设置移动端

```
/ztl-coder-browse mobile
```

### 恢复桌面

```
/ztl-coder-browse desktop
```

## Cookie 管理

### 设置 Cookie

```
/ztl-coder-browse cookie set name=value
```

### 获取 Cookie

```
/ztl-coder-browse cookie get [name]
```

### 清除 Cookie

```
/ztl-coder-browse cookie clear
```

### 导入 Cookie

```
/ztl-coder-browse cookie import cookies.json
```

### 导出 Cookie

```
/ztl-coder-browse cookie export cookies.json
```

## 会话管理

### 保存会话

```
/ztl-coder-browse session save my-session
```

### 加载会话

```
/ztl-coder-browse session load my-session
```

### 列出会话

```
/ztl-coder-browse session list
```

### 删除会话

```
/ztl-coder-browse session delete my-session
```

## 网络监控

### 获取网络请求

```
/ztl-coder-browse network
```

### 获取控制台日志

```
/ztl-coder-browse console
```

### 清除日志

```
/ztl-coder-browse clear-logs
```

## 使用示例

### 登录流程

```bash
# 启动浏览器
/ztl-coder-browse start

# 导航到登录页
/ztl-coder-browse goto https://example.com/login

# 填写表单
/ztl-coder-browse fill "用户名" "admin"
/ztl-coder-browse fill "密码" "password123"

# 点击登录
/ztl-coder-browse click "登录"

# 等待跳转
/ztl-coder-browse wait-text "欢迎"

# 保存会话
/ztl-coder-browse session save logged-in
```

### 页面测试

```bash
# 加载会话
/ztl-coder-browse session load logged-in

# 导航到测试页面
/ztl-coder-browse goto https://example.com/dashboard

# 获取快照
/ztl-coder-browse snapshot

# 验证元素存在
/ztl-coder-browse wait "用户头像"

# 截图
/ztl-coder-browse screenshot dashboard.png
```

### 数据抓取

```bash
# 导航到页面
/ztl-coder-browse goto https://example.com/products

# 获取所有链接
/ztl-coder-browse links

# 执行脚本提取数据
/ztl-coder-browse eval "
  Array.from(document.querySelectorAll('.product'))
    .map(el => el.textContent)
"

# 导出 Cookie 用于后续请求
/ztl-coder-browse cookie export cookies.json
```

## 配置选项

### 浏览器配置

```json
{
  "browse": {
    "browser": "chromium",
    "headless": true,
    "timeout": 30000,
    "viewport": {
      "width": 1280,
      "height": 720
    },
    "locale": "zh-CN",
    "timezone": "Asia/Shanghai"
  }
}
```

### 会话存储

```json
{
  "browse": {
    "sessionDir": ".browse/sessions",
    "maxSessions": 10,
    "sessionExpiry": "7d"
  }
}
```

## 输出格式

### 快照输出

```
📄 Page Snapshot: https://example.com

📑 Title: Example Domain

🔗 Links (3):
- [Learn more] -> https://www.iana.org/domains/example
- [About] -> /about
- [Contact] -> /contact

📝 Text Content:
This domain is for use in illustrative examples...

🖼️ Elements:
- heading: "Example Domain"
- paragraph: "This domain is for use..."
- link: "More information..."
```

### 网络请求输出

```
📡 Network Requests (5):

1. GET https://example.com/
   Status: 200 OK
   Type: document
   Time: 234ms

2. GET https://example.com/style.css
   Status: 200 OK
   Type: stylesheet
   Time: 45ms

3. GET https://example.com/script.js
   Status: 200 OK
   Type: script
   Time: 67ms
```

### 控制台输出

```
🖥️ Console Messages (3):

[log] Application started
[warn] Deprecated API usage
[error] Failed to load resource: net::ERR_FAILED
```

## 注意事项

- 浏览器会话在命令结束后仍然保持
- 使用完毕后记得关闭浏览器
- 敏感操作需要确认
- Cookie 文件包含敏感信息，注意保护

## 与其他命令配合

### 与 E2E 测试配合

```bash
/ztl-coder-browse start
/ztl-coder-e2e-tester run
/ztl-coder-browse close
```

### 与截图验证配合

```bash
/ztl-coder-browse goto https://example.com
/ztl-coder-browse screenshot expected.png
# 修改代码后
/ztl-coder-browse goto https://example.com
/ztl-coder-browse screenshot actual.png
# 对比截图
```
