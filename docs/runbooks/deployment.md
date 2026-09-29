# Deployment runbook

## 产品构建

根构建：

```bash
pnpm build
```

构建顺序包含 SDK、admin、server。产品容器只需要 admin/server，可使用：

```bash
pnpm build:app
```

Docker 使用多阶段构建：

- build 阶段安装 admin/server 开发依赖并执行 `build:app`
- runtime 阶段只安装 server 生产依赖
- 复制 `apps/server/dist` 与 `apps/admin/dist`
- 最终执行 `node apps/server/dist/index.js`

admin 构建元数据优先从 `GIT_SHA` / `VITE_GIT_SHA` 获取 Git Hash。

## 部署前检查

```bash
pnpm typecheck
pnpm build
pnpm format:check
docker compose config
```

准备真实 `.env`，确认至少：

- TOKEN_SECRET / 管理员凭证不是示例值；
- OSS region/bucket/AccessKey 正确；
- `data/` 目录可持久化且权限受控；
- 端口未被占用。

若已有 `data/runtime-state.json`，升级前备份它。该文件包含 clientSecret，备份也必须按敏感配置保护。

## Docker Compose

```bash
docker compose up -d --build
```

当前 Compose 约定：

- container: `ali-oss-server`
- network: `ali-oss`
- 端口：`${PORT:-9512}:${PORT:-9512}`
- volume：`./data:/app/data`
- restart: `unless-stopped`

## 发布后验证

```bash
curl http://localhost:9512/health
```

并确认：

- `/admin` 可加载；
- 管理端登录正常；
- 运行态 client/IP/限流在重启后仍存在；
- 若本次触碰认证/OSS，再执行 `testing.md` 中对应 smoke。

## 回滚

当前没有数据库迁移。

1. 保留/备份当前 `data/runtime-state.json` 和 `.env`。
2. 回到上一个已知可用代码/镜像版本。
3. 重新构建/启动。
4. 验证 `/health`、`/admin` 和关键业务 API。
5. 如果新版本修改过 runtime-state schema，按该版本发布说明决定是否恢复旧备份；不要盲目用新 schema 文件启动旧代码。

## 版本

产品版本：

```bash
pnpm version:app <version>
```

只同步 `apps/admin` 与 `apps/server`。

SDK 版本独立维护。当前仓库没有自动 npm 发布 workflow；SDK 发布动作应独立验证 build/typecheck、包版本、npm 身份与目标 registry，不要把产品 Docker 发布和 SDK 发布绑定为同一个不可分割步骤。
