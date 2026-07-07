# 当前任务

- 日期：2026-07-07
- 需求：拆分 `apps/sdk/src/index.ts`，解决 SDK 入口文件过于臃肿的问题。
- 状态：已完成，已通过 `pnpm --filter @ali-oss-server/sdk typecheck` 与 `pnpm --filter @ali-oss-server/sdk build`，本次触碰文件未检测到 UTF-8 BOM。
- 方案：保持 `index.ts` 作为唯一公开入口，只做 re-export；按职责拆分为类型、错误、常量、输入/响应工具、对象 key 工具、HTTP 请求工具、Token 管理与 OSS 操作客户端，确保公开 API 和包导出路径不变。

## 计划

1. [x] 审计 SDK 当前单文件实现和包导出配置。
2. [x] 按职责拆分 `apps/sdk/src/index.ts`。
3. [x] 运行 SDK 类型检查并检查触碰文件 UTF-8 BOM。
4. [x] 更新任务交接记录。
