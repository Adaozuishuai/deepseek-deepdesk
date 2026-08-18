# src/AGENTS.md

`src/` 是应用源码根目录。改这里默认影响运行时行为，必须保持 Electron 分层清晰。

## 子目录职责

- `shared/`：主进程、preload、renderer 共用类型、IPC 契约、LLM 协议代码。
- `main/`：Electron 主进程，负责窗口、存储、IPC、网络请求、Agent 循环、工具执行。
- `preload/`：唯一的 `contextBridge` 暴露层。
- `renderer/`：React UI、zustand 状态、样式和交互。

## 跨层规则

- Renderer 禁止直接 `fetch` 外部服务；网络请求走 main IPC。
- Renderer 禁止 import Electron/Node API。
- Main 可以 import `src/shared`，不要 import renderer。
- Preload 只做桥接，不放业务逻辑。
- 新增共享类型和 IPC 契约优先放 `shared/`。

## 验证

- 普通源码改动：`pnpm flow -- check`
- IPC、持久化、安全、Agent 工具改动：`pnpm flow -- check --include-build`
