# src/shared/AGENTS.md

`src/shared/` 是跨进程契约层。这里的类型和常量会同时约束 main、preload、renderer。

## 可以放什么

- 领域类型：Provider、Conversation、Message、Agent 类型。
- IPC channel 常量。
- `window.api` 类型契约。
- 与 Electron 无关的 LLM 协议解析和工具函数。

## 禁止事项

- 不 import `electron`。
- 不访问文件系统、窗口、DOM。
- 不放 renderer 组件或 main 运行时逻辑。
- 不引入 `any`；用 `unknown` + 类型收窄。

## 常见修改路径

新增 IPC：

1. `ipc-channels.ts`
2. `api.ts`
3. `../preload/index.ts`
4. `../main/ipc.ts`
5. renderer 调用方
6. 测试

## 验证

运行 `pnpm flow -- check`。涉及 IPC 时追加 `pnpm flow -- check --include-build`。
