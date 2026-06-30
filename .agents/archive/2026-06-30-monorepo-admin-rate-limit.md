# 已归档任务：monorepo 化并新增管理端、IP 限制与接口限流

## 目标

- 将项目调整为 monorepo，拆分为 `apps/server` 和 `apps/admin`
- 新增 Vite + React + MUI 管理端，并由后端托管其静态资源
- 后端新增管理员登录、动态 IP 限制、全局/接口级限流管理能力
- 更新文档、环境变量示例和运行脚本，完成构建验证

## 结果

- 新增 `apps/server` 与 `apps/admin` workspace 结构
- 后端新增 `/api/admin` 路由、管理员登录、内存级 IP 限制和内存级限流配置
- 后端新增 `/admin` 静态资源托管，生产环境直接提供管理端页面
- 管理端支持登录、编辑 IP allowlist、编辑全局限流和接口级限流
- 根级 `Dockerfile`、workspace 脚本、`.env.example`、README 已同步更新

## 验证

- `pnpm install`
- `pnpm typecheck`
- `pnpm build`
