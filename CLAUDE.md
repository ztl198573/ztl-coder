# ztl_coder: 项目规则

## 编写规范

- 不使用破折号。使用冒号、逗号或括号表示旁注，重构依赖破折号的句子。

## 代码风格

- 业务逻辑不使用类。使用工厂函数（`createX`）配合闭包状态
- 函数体内嵌套不超过 2 层。优先使用早期返回和小型辅助函数
- 最大函数长度：40 行
- 不使用魔法数字/字符串。使用命名常量。将共享可调参数放在 `src/utils/config.ts`
- 不使用 `any` 类型。最小化类型断言（`as Type`）：优先使用 Valibot schemas 或类型守卫
- 在系统边界使用 `unknown`，使用 Valibot 或 `extractErrorMessage(...)` 进行规范化处理
- 不解释 *what* 的注释，只解释 *why*（当不明显时）
- 双引号、分号、尾随逗号（由 Biome 强制）
- 每个函数最大认知复杂度：10
- 所有 promise 必须被 await 或显式处理；禁止浮动 promise

## 架构

### 模块布局
- `src/agents/` - 代理配置对象（纯数据，无逻辑）。每个导出一个 `AgentConfig`
- `src/hooks/` - 生命周期钩子工厂：`createXHook(ctx: PluginInput) => { handlers }`
- `src/tools/` - 工具定义
- `src/utils/` - 共享工具：`config.ts`（集中可调参数）、`errors.ts`（错误提取）、`logger.ts`（结构化日志）
- `src/mindmodel/` - 项目特定编码模式约束
- `thoughts/` - 持久化工件存储：`ledgers/`（会话连续性）、`shared/plans/` 和 `shared/designs/`（输出）

### 约定
- 仅使用命名导出；`src` 中无默认导出（配置文件除外）
- 通过 barrel 文件（`index.ts`）重新导出公共 API
- 通过 `@/utils/logger` 中的 `log.info/warn/error/debug` 记录日志，不直接使用 `console.*`

## TypeScript

- 名称即契约：有领域意义，不使用 `data`/`result`/`temp`
- 优先使用单词名称。删除冗余前缀（`allWarnings` -> `warnings`）
- 标识符中不使用类型名（无匈牙利命名法）
- 契约优先使用 `interface`，联合/别名使用 `type`
- 优先使用可辨识联合而非类层次结构
- 对状态/事件使用 `as const` 常量映射并从中派生联合类型
- 类型导入使用 `import type`
- 导出函数需要显式返回类型
- 不应改变的数据结构使用 `readonly`

## 模块结构

- 文件顺序：imports -> 导出的 types/constants -> 内部 constants/schemas -> 私有 helpers -> 主工厂/export
- 保持注释简洁，仅用于非明显行为

## 导入和路径

- 跨文件夹项目导入使用 `@/*` 别名
- 同一文件夹内使用 `./` 相对导入
- 适当使用 `@/*` 时不使用父相对导入（`../`）
- Node.js 内置模块使用 `node:` 前缀（`node:fs`、`node:path`）

## 工程原则

- DRY：提取共享模式，不复制粘贴
- YAGNI：无推测性功能或未使用的抽象
- 快速失败：早期验证输入，在快乐路径之前返回/抛出
- 依赖注入：传入依赖，不导入单例
- 错误即值：在 catch 块中使用 `src/utils/errors.ts` 中的 `extractErrorMessage`

## 验证

- 在系统边界使用 Valibot（`v.*`）进行 schema 定义和运行时验证
- 通过 `v.InferOutput<typeof Schema>` 从 schemas 派生类型
- 使用基于管道的验证链（`v.pipe(v.number(), v.minValue(1))`）

## 事件和运行时安全

- 永远不让监听器异常中断循环；在 `try/catch` 中包装扇出回调
- 清理尽最大努力（`disconnect/close/unsubscribe` 不应掩盖主要故障）
- 将状态名称定义为 `as const` 映射并派生联合类型

## 测试

- 测试真实行为，而非模拟行为
- 模拟数据，而非行为
- 所有错误路径必须有测试
- 所有公共导出必须有测试
- 在 `tests/` 中放置测试，镜像 `src/` 结构
- 使用 Bun 的原生测试运行器（`bun:test`）
