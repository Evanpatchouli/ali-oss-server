# 当前任务

- 日期：2026-07-07
- 需求：参考 `C:\Work\benefits\benefits-ui\packages\cheguanjia-landing` 在 admin 注入版本信息。
- 状态：已完成，已通过 `pnpm --filter @ali-oss-server/admin typecheck` 和 `pnpm --filter @ali-oss-server/admin build`，本次触碰文件未检测到 UTF-8 BOM。
- 方案：在 admin Vite 配置中读取 `package.json` 和 git short SHA，注入 `__APP_NAME__`、`__APP_VERSION__`、`__GIT_SHA__` 常量并写入 HTML meta；管理端顶部栏显示版本号和 git hash，build time 放入 hover 标题。

## 计划

1. [x] 查阅全局规则和参考项目版本注入方式。
2. [x] 在 Vite 配置中注入版本常量与 HTML meta。
3. [x] 在 admin UI 顶部栏展示版本信息。
4. [x] 运行类型检查并检查触碰文件 BOM。
