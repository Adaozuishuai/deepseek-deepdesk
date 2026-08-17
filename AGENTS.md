# AGENTS.md

这是 DeepDesk 桌面客户端（Electron + React + TypeScript）的项目说明书。任何 AI 编码助手（Codex / Claude Code / DeepDesk Agent 本身）在本仓库工作时，都应先读本文件，再动手改代码。

## 项目概览

DeepDesk 是一款对标 Codex / Claude 的桌面 AI 客户端，包含两块核心能力：

- **聊天**：流式对话、Markdown 渲染、多模型服务管理、会话持久化
- **编码 Agent**：工具调用循环（执行命令 / 读写编辑文件 / 列目录 / 搜索 / 飞书消息），三档权限模式

## 目录结构

```
src/
├── shared/        # 主进程/渲染进程共享：类型、IPC 通道、LLM 客户端、Agent 类型
├── main/          # Electron 主进程：窗口、JSON 存储、IPC、Agent 循环、工具执行
├── preload/       # contextBridge 安全桥接（window.api）
└── renderer/      # React 界面：chat / agent / settings / sidebar / titlebar
tests/             # vitest 测试
scripts/           # 图标生成等脚本
docs/              # 架构说明
```

## 命令

```sh
pnpm install      # 安装依赖（node >= 18.18，pnpm 10）
pnpm dev          # 开发模式（热更新）
pnpm start        # 运行已构建版本
pnpm test         # vitest 单元测试
pnpm typecheck    # TypeScript 类型检查
pnpm lint         # oxlint
pnpm build        # electron-vite 构建
pnpm smoke        # 构建 + Electron 冒烟测试
pnpm package:win  # 打 Windows NSIS 安装包
```

## 架构约定

- **网络请求一律在主进程**（src/main）执行；渲染层只通过 preload 暴露的 `window.api` 走 IPC，禁止渲染层直接 fetch。
- 新增 IPC 的固定步骤：`ipc-channels.ts` 加通道常量 → `api.ts` 加类型 → `preload` 暴露 → `main/ipc.ts` 注册 handler。
- 新增 Agent 工具：`agent-tools.ts` 加 schema → `tools.ts` 加 `executeTool` 分支 → `agent.ts` 的 `evaluatePermission` 决定是否需批准。
- 共享代码放 `src/shared`，不要跨层直接 import Electron。

## 安全约束（改动前必读）

- API Key 存本地 `userData/deepdesk.json`，绝不上传第三方。
- Agent 文件操作默认限定工作目录；越界、发飞书消息按权限模式审批。
- 危险命令（rm -rf / format / shutdown 等）在「每次询问/替我审批」下强制询问。
- 改动权限/安全/持久化逻辑，必须同步补测试。

## 代码风格

- TypeScript strict；不引入 `any`（用 `unknown`/`never` + 类型收窄）。
- 字符串与 JSX 属性用单引号。
- 异步副作用显式 `void fn()` 标记，避免浮空 Promise。
- 提交信息用 Conventional Commits：`feat` / `fix` / `chore` / `docs` / `refactor` / `test`。

## 测试

- 核心逻辑都有 vitest 测试；改行为必须同步改测试。
- 测试用 mock（vi.mock / mock LLM / mock window.api），不联网、不真发飞书消息、不真执行危险命令。
- `pnpm test` 全绿才能提交。
