# DeepDesk CI 说明

CI 负责把本地工程化脚本放到远端执行，确保 PR 和发版不依赖个人机器状态。

## 工作流

| 文件 | 触发 | 作用 |
| --- | --- | --- |
| `.github/workflows/ci.yml` | push / PR / 手动 | typecheck、lint、test、build、Windows smoke、Windows E2E |
| `.github/workflows/release.yml` | 手动 | 按平台打包并上传 artifact |

## 设计原则

- CI 调用 `pnpm flow -- ...`，不重复编码流程。
- 不使用真实 API Key。
- 不调用真实模型或飞书。
- macOS 包在 macOS runner 打。
- Windows smoke 在 Windows runner 跑。

## 本地等价命令

PR 门禁：

```sh
pnpm flow -- ci --include-build
```

发版候选：

```sh
pnpm flow -- release --target win
```
