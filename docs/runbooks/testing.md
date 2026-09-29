# Testing runbook

## 当前测试现状

截至 2026-09-29，仓库没有通用的自动化单元/集成/E2E 测试套件，也没有 GitHub Actions CI workflow。SDK 提供一项 Node 内置测试运行的发布包消费 smoke，覆盖打包安装后的 ESM、CommonJS、TypeScript NodeNext 导入和流式上传文件名 header。Server 提供 Node 内置的文件名协议测试，不执行真实 OSS 上传。

因此：

- 不要写出不存在的根级 `pnpm test`。
- 不要在未实际执行验证时声称“测试已通过”。
- 当前最低验证由 typecheck、build、format check 和按影响面选择的 HTTP/OSS smoke 组成。
- SDK 消费 smoke 不依赖测试框架；它验证发布 tarball 的外部消费行为。

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
pnpm --filter @ali-oss-server/server test:protocol
pnpm --filter @ali-oss-server/server test:contract
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
pnpm --filter @ali-oss-server/sdk test:consumer
pnpm --filter @ali-oss-server/sdk test:upload-stream
```

`test:consumer` 先移除 SDK 的 `dist/`，再使用 `npm pack` 触发 `prepack` 自动构建并生成 tarball；它在独立临时目录安装后，分别运行 `.mjs` 和 `.cjs` 消费脚本，并通过 TypeScript NodeNext 检查两种模块格式的声明解析。文件名案例还通过 Node `Headers` 验证打包后 SDK 构造的请求头和服务端最终 objectKey 的原样返回。运行 `test:consumer` 无需提前 build。SDK `test:upload-stream` 覆盖取消、token refresh 边界、无 signal 和 HTTP 错误包装，并使用本地 HTTP server 与 Node 原生 fetch 验证 in-flight abort 会中止请求且销毁输入 readable；不连接真实 OSS，要求先 build。`test:protocol` 检查 server 解码、非法 header 的 400 错误与服务层实际 objectKey 推导，不连接 OSS。`test:contract` 通过公共 OSS service 函数和 mock OSS I/O 验证 client objectKey 隔离、上传/删除的最终 objectKey 与错误传播；URL 断言使用已安装的 ali-oss 生成对象 URL，不连接真实 OSS。

容器配置：

```bash
docker compose config
```

需要验证镜像时再执行 `docker compose build`；纯文档修改不要求构建镜像。

## 按改动选择最小验证集

| 改动范围                 | 最小验证                                                    | 需要额外 smoke 的情况                    |
| ------------------------ | ----------------------------------------------------------- | ---------------------------------------- |
| 仅文档/Agent 规范        | Markdown/链接 review；需要时 `pnpm format:check`            | 无                                       |
| server 类型/纯逻辑       | server typecheck + build                                    | 路由、中间件、认证、持久化改变           |
| admin UI                 | admin typecheck + build                                     | 路由、API 调用、生产 base/静态资源改变   |
| SDK                      | sdk typecheck + build + consumer smoke + upload-stream test | token、上传、删除或公开导出改变          |
| root/workspace/Docker    | `pnpm typecheck` + `pnpm build` + `docker compose config`   | Dockerfile/Compose 运行时改变            |
| auth/object key/security | server + SDK 相关验证                                       | 必须做定向 HTTP/OSS smoke，并独立 review |
| runtime-state            | server typecheck/build                                      | 写入、重启读取、失败回滚、volume 持久化  |

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
