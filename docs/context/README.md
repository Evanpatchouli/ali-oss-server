# Context retrieval / RAG

本目录是 Agent 的检索入口，不是第二份代码仓库。

## 默认检索流水线

1. 把目标改写成模块、symbol、接口路径、错误码、环境变量或包名。
2. 优先精确检索路径/symbol/引用/Git history，不先读整个仓库。
3. 根据下表读取直接相关 spec / architecture / ADR / runbook。
4. 若运行时提供语义检索，再作为补充；不可用不阻塞。
5. 以当前 branch 的代码、配置和可运行结果校正文档。
6. 只组装当前 Work Unit 需要的 Context Pack。

## 模块索引

| 领域 / 模块 | 代码入口 | 当前验证入口 | 相关文档 | 检索关键词 |
| --- | --- | --- | --- | --- |
| Koa 应用装配 | `apps/server/src/app.ts`, `apps/server/src/routes/index.ts` | `pnpm --filter @ali-oss-server/server typecheck`, `build` | `../architecture/README.md` | `createApp`, `createRouter`, `/health` |
| 环境配置 | `apps/server/src/config/env.ts`, `apps/server/src/utils/paths.ts` | 服务启动 / typecheck | `../runbooks/development.md` | `TOKEN_SECRET`, `OSS_REGION`, `workspaceEnvFilePath` |
| 调用方认证 | `routes/auth-routes.ts`, `services/auth-service.ts`, `utils/token.ts` | auth smoke | `../specs/api-contracts.md`, `../decisions/003-auth-and-object-isolation.md` | `x-client-id`, `signAccessToken`, `clientSecretHash` |
| Admin 鉴权与配置 | `routes/admin-routes.ts`, `middleware/authenticate-admin.ts`, `services/admin-auth-service.ts` | admin login/API smoke | `../specs/api-contracts.md` | `/api/admin`, `signAdminAccessToken` |
| 运行态状态 | `services/runtime-state-service.ts`, `auth-client-service.ts`, `ip-allowlist-service.ts`, `rate-limit-service.ts` | restart + state file smoke | `../decisions/002-runtime-state-json.md` | `runtime-state.json`, `persistRuntimeState`, `replaceAuthClients` |
| OSS 对象操作 | `services/oss-service.ts`, `routes/oss-routes.ts`, `core/client.ts` | upload/list/delete smoke | `../specs/api-contracts.md` | `clientId`, `objectKey`, `putStream`, `listV2` |
| 中间件 | `apps/server/src/middleware/` | server typecheck + HTTP smoke | `../architecture/README.md` | `errorHandler`, `enforceIpAllowlist`, `enforceRateLimit` |
| 管理端 | `apps/admin/src/`, `apps/admin/vite.config.ts` | admin typecheck/build | `../architecture/README.md`, `../runbooks/development.md` | `/admin`, `__APP_VERSION__`, `__APP_CHANGELOG__` |
| Node SDK | `apps/sdk/src/client.ts`, `apps/sdk/src/index.ts`, `apps/sdk/src/types.ts` | sdk typecheck/build | `../specs/api-contracts.md`, `../../apps/sdk/README.md` | `AliOssServerSdk`, `uploadStream`, `refreshToken` |
| 构建/容器 | 根 `package.json`, `Dockerfile`, `docker-compose.yml` | `pnpm build`, `docker compose config` | `../runbooks/deployment.md` | `build:app`, `GIT_SHA`, `ali-oss-server` |
| 版本/变更日志 | `scripts/bump-app-version.mjs`, `CHANGELOG.md`, `.agents/skills/maintain-changelog/` | version diff / format check | `../runbooks/deployment.md` | `version:app`, `CHANGELOG` |

## 新鲜度规则

- 历史 `.agents/decisions.md`、`.agents/lessons.md` 和 archive 可用于找背景，但必须再与当前代码核对。
- SDK、server、admin 是独立包；读取包内行为时同时检查根 workspace 脚本，避免误判运行方式。
- 文档和代码冲突时，以当前代码/可运行结果为准，并在同一任务中修正文档。

## 上下文预算

普通 feature/bugfix 尽量保持约 20K–60K token。跨 server + admin + sdk 的变更先分别检索，再只合并交叉边界，不因仓库较小就默认全量加载。
