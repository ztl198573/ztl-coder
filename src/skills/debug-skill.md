# Debug 调试技能

> 当用户报告运行报错时，自动增强可观测性并定位根因

## 触发条件

- 用户说"报错了"、"出 bug 了"、"运行失败"
- 用户提供错误堆栈或错误信息
- 用户描述异常行为
- 测试失败需要调查原因

## 调试流程

### Step 1: 收集错误信息

```markdown
请提供以下信息：
1. 完整的错误消息和堆栈
2. 复现步骤
3. 预期行为 vs 实际行为
4. 运行环境（开发/测试/生产）
```

### Step 2: 分析调用链

```
从错误堆栈识别调用链：
Entry Point → Layer1 → Layer2 → Error Location
     ↓           ↓         ↓          ↓
  [日志点1]  [日志点2]  [日志点3]  [日志点4]
```

### Step 3: 注入调试日志

在关键位置添加日志：

```typescript
// 1. 函数入口/出口
function targetFunction(params) {
  console.log('[DEBUG] targetFunction ENTRY:', { params });
  try {
    const result = /* ... */;
    console.log('[DEBUG] targetFunction EXIT:', { result });
    return result;
  } catch (error) {
    console.error('[DEBUG] targetFunction ERROR:', error);
    throw error;
  }
}

// 2. 数据变化点
function processData(data) {
  console.log('[DEBUG] processData INPUT:', data);
  const transformed = transform(data);
  console.log('[DEBUG] processData OUTPUT:', transformed);
  return transformed;
}

// 3. 外部调用
async function callApi(url) {
  console.log('[DEBUG] API CALL:', { url, timestamp: Date.now() });
  const response = await fetch(url);
  console.log('[DEBUG] API RESPONSE:', { status: response.status });
  return response;
}
```

### Step 4: 运行并分析

1. 重新运行代码
2. 收集日志输出
3. 分析数据流和调用过程
4. 定位问题根因

### Step 5: 修复并验证

1. 基于日志分析确定修复方案
2. 实施修复
3. 验证问题已解决
4. 清理调试日志（保留有用的）

## 日志工具函数

```typescript
// 可复用的调试日志工具
const DebugLog = {
  enabled: process.env.DEBUG === 'true',

  entry(fn: string, args: Record<string, unknown>) {
    if (!this.enabled) return;
    console.log(`[ENTRY] ${fn}`, JSON.stringify(args, null, 2));
  },

  exit(fn: string, result: unknown) {
    if (!this.enabled) return;
    console.log(`[EXIT] ${fn}`, JSON.stringify(result, null, 2));
  },

  data(label: string, before: unknown, after: unknown) {
    if (!this.enabled) return;
    const changed = JSON.stringify(before) !== JSON.stringify(after);
    console.log(`[DATA] ${label}`, { before, after, changed });
  },

  error(fn: string, error: Error) {
    console.error(`[ERROR] ${fn}`, {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  },

  time(label: string) {
    if (!this.enabled) return;
    console.time(label);
  },

  timeEnd(label: string) {
    if (!this.enabled) return;
    console.timeEnd(label);
  }
};

// 使用示例
function exampleFunction(input: string) {
  DebugLog.entry('exampleFunction', { input });
  DebugLog.time('exampleFunction');

  try {
    const result = processInput(input);
    DebugLog.data('transformation', input, result);

    DebugLog.timeEnd('exampleFunction');
    DebugLog.exit('exampleFunction', result);
    return result;
  } catch (error) {
    DebugLog.error('exampleFunction', error);
    throw error;
  }
}
```

## 常见问题模式

### 空值/未定义
```typescript
// 添加空值检查日志
if (value === null || value === undefined) {
  console.warn('[DEBUG] Null/Undefined detected', {
    variable: 'value',
    context: { /* 相关上下文 */ }
  });
}
```

### 类型错误
```typescript
// 添加类型检查日志
console.log('[DEBUG] Type check', {
  variable: 'data',
  expectedType: 'object',
  actualType: typeof data,
  value: data
});
```

### 异步问题
```typescript
// 添加时序日志
const requestId = Math.random().toString(36).slice(2);
console.log(`[DEBUG] ${requestId} START`);
await asyncOperation();
console.log(`[DEBUG] ${requestId} END`);
```

## 输出模板

### 调试报告
```markdown
# 调试报告

## 问题
[错误描述]

## 调用链
[调用链图]

## 日志分析
[关键日志和分析]

## 根因
[根本原因]

## 修复
[修复代码]

## 验证
[验证结果]
```
