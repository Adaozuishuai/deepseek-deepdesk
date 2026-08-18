# e2e/AGENTS.md

`e2e/` 放真实 Electron UI 端到端测试。

## 规则

- 使用 Playwright Electron 启动应用。
- 每个测试必须使用临时 `DEEPDESK_USER_DATA_DIR`，不能污染真实用户数据。
- 不调用真实模型服务。
- 不发送真实飞书消息。
- 不依赖本机已有配置。
- 优先覆盖核心用户路径：启动、设置、聊天、Agent 审批。

## 验证

运行：

```sh
pnpm flow -- e2e                 # isolated: 每条用例独立启动客户端
pnpm flow -- e2e --mode session  # session: 一个窗口连续跑验收流
```
