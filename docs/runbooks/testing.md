# Testing runbook

## 当前测试现状

截至 2026-09-29，仓库**没有自动化单元/集成/E2E 测试套件，也没有 GitHub Actions CI workflow**。

因此：

- 不要写出不存在的 `pnpm test`。
- 不要在未实际执行验证时声称“测试已通过”。
- 当前最低验证由 typecheck、build、format check 和按影响面选择的 HTTP/OSS smoke 组成。
- 后续若加入测试框架，应更新本页并让自动化测试成为相应行为的主要验证证据。

## 基础验证

全 workspace：

```bash
pnpm typecheck
pnpm build
pnpm format:check
```

仅 server：

```bash
pnpm --filter @ali-oss-server/server typecheck
pnpm --filter @ali-oss-server/server build
```

仅 admin：

```bash
pnpm --filter @ali-oss-server/admin typecheck
pnpm --filter @ali-oss-server/admin build
```

仅 SDK：

```bash
pnpm --filter @ali-oss-server/sdk typecheck
pnpm --filter @ali-oss-server/sdk build
```

容器配置：

```bash
docker compose config
```

需要验证镜像时再执行 `docker compose build`；纯文档修改不要求构建镜像。

## 按改动选择最小验证集

| 改动范围 | 最小验证 | 需要额外 smoke 的情况 |
| --- | --- | --- |
| 仅文档/Agent 规范 | Markdown/链接 review；需要时 `pnpm format:check` | 无 |
| server 类型/纯逻辑 | server typecheck + build | 路由、中间件、认证、持久化改变 |
| admin UI | admin typecheck + build | 路由、API 调用、生产 base/静态资源改变 |
| SDK | sdk typecheck + build | token、上传、删除或公开导出改变 |
| root/workspace/Docker | `pnpm typecheck` + `pnpm build` + `docker compose config` | Dockerfile/Compose 运行时改变 |
| auth/object key/security | server + SDK 相关验证 | 必须做定向 HTTP/OSS smoke，并独立 review |
| runtime-state | server typecheck/build | 写入、重启读取、失败回滚、volume 持久化 |

## Smoke 基线

有有效本地 `.env` 时至少可检查：

```bash
curl http://localhost:9512/health
```

涉及业务认证/OSS 时，使用管理端创建专用测试 client，再验证：

1. 正确 HMAC 能换 token，错误签名不能。
2. client token 可上传/删除自己的对象。
3. object key 始终落入对应 `clientId/`。
4. 流式上传拒绝错误 Content-Type，且超限返回 413。
5. 删除 client / 重置 secret 后旧 token 按当前契约失效。
6. admin token 能访问 admin API，client token 不能替代 admin token。

真实 OSS smoke 会产生/删除云端对象，必须使用明确测试路径并在完成后清理；不要用生产关键对象做验证。

## Review

非平凡改动完成后，Reviewer 独立阅读真实 diff。安全相关修改重点检查 token 撤销、权限混用、路径逃逸、secret 泄漏和状态持久化。
