# scripts/AGENTS.md

`scripts/` 放工程化和开发辅助脚本。脚本是 AI 友好的稳定入口，优先参数化，不写隐式流程。

## 规则

- 新增重复性流程优先接入 `flow.mjs`。
- 脚本参数必须有 help 或在 `docs/engineering.md` 说明。
- 脚本失败必须返回非 0 exit code。
- 不默认删除 `out/`、`release/` 等产物；清理必须显式参数。
- 不在脚本中硬编码密钥、用户私有路径或真实服务凭据。

## 变更后同步

- 更新 `docs/engineering.md`。
- 更新根 `AGENTS.md` 命令清单。
- 必要时更新 `.agents/skills/deepdesk-engineering/SKILL.md`。

## 验证

至少运行：

```sh
pnpm flow -- doctor
pnpm flow -- check
```
