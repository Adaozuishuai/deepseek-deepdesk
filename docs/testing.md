# DeepDesk 测试策略

DeepDesk 当前具备基础质量门禁，但完整 UI 端到端测试仍需补齐。

## 当前测试层级

| 层级 | 命令 | 当前状态 |
| --- | --- | --- |
| 类型检查 | `pnpm typecheck` | 已有 |
| E2E 类型检查 | `pnpm typecheck:e2e` | 已有 |
| 静态检查 | `pnpm lint` | 已有 |
| 单元/集成测试 | `pnpm test` | 已有，Vitest |
| 构建验证 | `pnpm build` | 已有 |
| Electron smoke | `pnpm smoke` | 已有，验证 renderer 加载 |
| UI E2E isolated | `pnpm flow -- e2e` | 已接入，Playwright Electron，每条用例独立窗口 |
| UI E2E session | `pnpm flow -- e2e --mode session` | 已接入，单窗口连续验收 |

推荐统一执行：

```sh
pnpm flow -- check --include-build --include-smoke
```

## 已覆盖重点

- OpenAI 兼容 SSE 流式解析
- LLM 错误、usage、reasoning 内容处理
- Agent 工具调用与权限审批
- 文件工具工作目录边界
- Zustand store 行为
- AppStore 持久化链路
- Electron renderer 加载 smoke
- Playwright Electron 覆盖启动、设置页、侧边栏、权限模式、Provider 弹窗、窗口最大化
- E2E 同时支持 CI 友好的 isolated 模式和人工观察友好的 session 模式

## 不应在测试中做的事

- 不联网调用真实模型。
- 不发送真实飞书消息。
- 不执行危险命令。
- 不读写用户真实配置目录，测试应使用临时目录。

## 端到端测试建设路线

第一阶段：最小 E2E（已接入）

- 引入 Playwright Electron。
- 使用已接入的 `pnpm e2e` / `pnpm flow -- e2e` 入口。
- 启动构建后的 Electron 应用。
- 验证首页、设置页、侧边栏可见。

第二阶段：核心业务 E2E

- 使用 mock LLM 服务。
- 设置 Provider。
- 发起一次聊天。
- 验证流式内容渲染和会话保存。

第三阶段：Agent E2E

- 设置临时工作目录。
- 发起安全的只读任务。
- 验证工具审批弹窗。
- 验证结果写入会话历史。

第四阶段：安装包 smoke

- 打包后启动 unpacked 应用。
- 可选：在 CI 虚拟机中安装 NSIS 包并启动应用。

## 测试补充规则

- 改 IPC：补 renderer/preload/main 合约测试或 store 集成测试。
- 改持久化：补重启读回测试。
- 改权限：补允许、拒绝、越界、危险命令测试。
- 改 LLM 协议：补 mock HTTP 流式测试。
- 改 UI 关键交互：至少补 store 测试；E2E 建好后补 UI 测试。
