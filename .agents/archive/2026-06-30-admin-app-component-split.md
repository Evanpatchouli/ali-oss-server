# 已归档任务：拆分管理端 App 入口

## 目标

- 将 `apps/admin/src/App.tsx` 收敛为入口组件
- 将管理端登录、控制台、IP 限制和限流界面拆分为独立组件
- 保持现有功能和构建结果不变

## 结果

- `App.tsx` 仅保留入口装配
- 控制台状态和页面编排迁移到 `features/admin/AdminConsole.tsx`
- 登录页、控制台壳层、IP 面板、限流面板拆分为独立组件
- 会话工具迁移到 `src/utils/session.ts`
- 前端类型统一收口到 `src/types`

## 验证

- `pnpm --filter @ali-oss-server/admin typecheck`
- `pnpm --filter @ali-oss-server/admin build`
