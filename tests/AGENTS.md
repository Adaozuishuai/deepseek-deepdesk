# tests/AGENTS.md

`tests/` 放 Vitest 测试。测试必须可重复、离线、安全。

## 规则

- 不调用真实模型服务。
- 不发送真实飞书消息。
- 不执行危险命令。
- 不写用户真实配置目录；使用 `tmpdir()` / `mkdtempSync()`。
- Electron、window.api、LLM 服务使用 mock。
- 行为变更必须补测试。

## 覆盖要求

- 改 LLM 协议：补 `llm.test.ts`。
- 改工具执行：补 `tools.test.ts`。
- 改 Agent 循环/权限：补 `agent.test.ts`。
- 改持久化：补 `appStore.test.ts` 或集成读回测试。
- 改 renderer store：补对应 store 测试。

## 验证

运行 `pnpm flow -- test --kind unit` 或 `pnpm flow -- check`。
