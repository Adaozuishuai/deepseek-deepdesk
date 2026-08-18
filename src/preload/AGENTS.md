# src/preload/AGENTS.md

`src/preload/` 是 renderer 访问主进程能力的唯一安全桥。

## 规则

- 只通过 `contextBridge.exposeInMainWorld` 暴露能力。
- 暴露对象必须符合 `src/shared/api.ts`。
- 事件监听必须返回解绑函数。
- 不放业务逻辑，不直接操作 DOM。
- 不扩大 Node/Electron 能力暴露面。

## 新增 API 路径

1. `src/shared/ipc-channels.ts` 定义 channel。
2. `src/shared/api.ts` 定义类型。
3. `src/preload/index.ts` 暴露方法。
4. `src/main/ipc.ts` 注册 handler。
5. renderer store/component 调用。

## 验证

运行 `pnpm flow -- check --include-build`。
