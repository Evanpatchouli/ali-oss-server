# 当前任务

- 日期：2026-07-07
- 需求：将产品版本号更新到 `1.0.1`，并封装版本号更新脚本。
- 状态：已完成，已通过 `pnpm --filter @ali-oss-server/admin build`，本次触碰文件未检测到 UTF-8 BOM。
- 方案：新增根脚本 `version:app`，调用 `scripts/bump-app-version.mjs` 同步更新 `apps/admin` 与 `apps/server` 版本号；SDK 独立发布，不纳入该脚本。

## 计划

1. [x] 读取 `maintain-changelog` 规则并确认 monorepo 版本策略。
2. [x] 新增产品版本更新脚本。
3. [x] 使用脚本更新 admin/server 版本到 `1.0.1`。
4. [x] 运行验证并检查触碰文件 BOM。
