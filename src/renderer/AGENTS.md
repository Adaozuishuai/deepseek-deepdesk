# src/renderer/AGENTS.md

`src/renderer/` 是 React 渲染层。它负责 UI 和交互状态，不直接持有高权限能力。

## 目录职责

- `src/components/`：UI 组件。
- `src/stores/`：zustand 状态与 `window.api` 调用编排。
- `src/hooks/`：React hooks。
- `src/lib/`：纯前端工具函数。
- `src/assets/`：样式。

## 规则

- 禁止直接 import `electron`、`fs`、`path` 等 Node/Electron API。
- 禁止直接请求模型、飞书或外部服务；统一走 `window.api`。
- 异步副作用用 `void fn()` 显式标记。
- 组件保持展示职责，跨组件业务状态放 store。
- 外部链接通过 `window.api.openExternal`。

## 验证

- UI/store 普通改动：`pnpm flow -- check`
- 涉及 preload/main API：`pnpm flow -- check --include-build`
