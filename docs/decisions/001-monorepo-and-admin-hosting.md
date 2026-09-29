# ADR-001: pnpm monorepo 与 server 托管 admin

- Status: accepted
- Date: 2026-09-29（根据现有实现整理）

## Context

项目同时包含 OSS HTTP 服务、管理后台和对外 Node SDK。server 与 admin 需要一起构建/部署，而 SDK 需要独立版本与发布节奏。

## Decision

- 使用 pnpm workspace，包位于 `apps/server`、`apps/admin`、`apps/sdk`。
- 开发时 server 与 admin 独立运行，Vite 代理 API。
- 生产时先构建 admin/server，由 server 在 `/admin` 托管 `apps/admin/dist`。
- admin 使用 `/admin/` 作为 Vite base 和 BrowserRouter basename。
- admin/server 产品版本通过根 `pnpm version:app <version>` 同步。
- SDK 版本独立维护，不随产品版本脚本更新。

## Alternatives considered

- admin 独立静态站点部署：会增加独立域名/CORS/部署单元。
- 将 SDK 与 server 作为一个 npm package：会把服务部署版本和调用库版本强耦合。

## Consequences

优点：
- 单仓库可共享发布上下文和文档。
- 生产部署只需一个 server 容器即可同时提供 API 与管理端。
- SDK 可独立演进。

代价：
- Docker 构建需要同时处理 server/admin 依赖和产物。
- admin 路由、base、静态回退必须持续保持 `/admin` 约定。

## Validation / follow-up

修改 workspace 结构、admin base、静态托管路径或版本策略时更新本 ADR，并执行对应 build/smoke。
