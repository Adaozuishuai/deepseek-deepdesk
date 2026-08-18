# DeepDesk E2E 测试规划

当前项目已接入 Playwright Electron E2E，先覆盖最小真实 UI 路径。后续继续扩展聊天和 Agent 场景。

## 当前入口

```sh
pnpm flow -- e2e                 # 隔离模式，CI 默认
pnpm flow -- e2e --mode session  # 会话模式，本地人工观察
pnpm flow -- e2e --mode all      # 全量模式
```

这些命令都会先执行生产构建，再启动真实 Electron 应用运行 `e2e/` 测试。

## 两种模式

| 模式 | 命令 | 行为 | 适用场景 |
| --- | --- | --- | --- |
| isolated | `pnpm e2e` / `pnpm flow -- e2e` | 每条用例独立启动和关闭客户端 | CI、稳定性优先 |
| session | `pnpm e2e:session` / `pnpm flow -- e2e --mode session` | 一个客户端窗口连续跑完整验收流 | 本地人工观察 |
| all | `pnpm e2e:all` / `pnpm flow -- e2e --mode all` | 两类测试都跑 | 发版前人工确认 |

## 技术方案

当前方案：Playwright Electron。

原因：

- 能启动 Electron 应用。
- 能驱动真实 BrowserWindow。
- 能断言 DOM 状态。
- 能和 mock LLM 服务组合。

## 已有最小 E2E 用例

- 启动应用。
- 使用临时 `DEEPDESK_USER_DATA_DIR` 隔离用户数据。
- 断言主窗口和输入框可见。
- 打开设置页。
- 断言设置页基础 Tab 可见。
- 验证设置快捷键和返回按钮。
- 验证侧边栏折叠、展开、新对话按钮。
- 验证输入框工具栏的 Agent 权限模式切换。
- 验证常规设置里的主题和 Agent 权限设置。
- 验证添加服务弹窗的必填校验和关闭。
- 验证窗口最大化按钮能改变真实 BrowserWindow 状态。

`e2e/app.spec.ts` 是隔离模式用例；`e2e/session.spec.ts` 是单窗口会话验收用例。

## 拖拽测试边界

标题栏拖拽属于系统窗口管理行为，Playwright 对 Electron 的 DOM 层拖拽不能稳定证明 OS 级窗口移动。当前用可验证的窗口控制按钮（最大化/还原）覆盖窗口交互主链路。

如果后续必须测拖拽，应单独做平台特定测试，并允许在 CI 中按平台跳过。

## 后续 E2E 用例

1. 启动应用。
2. 断言主窗口可见。
3. 进入设置页。
4. 添加 mock Provider。
5. 发起一条聊天。
6. 验证 assistant 消息渲染。
7. 重启后验证会话可读回。

## Agent E2E 用例

1. 设置临时工作目录。
2. 发起只读 Agent 任务。
3. 验证工具审批 UI。
4. 点击批准。
5. 验证工具结果进入会话。

## 约束

- E2E 必须使用 mock 服务。
- 不联网调用真实模型。
- 不发送真实飞书消息。
- 不写真实用户目录。
