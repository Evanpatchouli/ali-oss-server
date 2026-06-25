# 交接记录：Koa + TypeScript OSS 服务

## 当前状态

- 已完成 Koa Web 服务实现
- 已完成多调用方 client 签名换取 TOKEN
- 已完成上传文件到 OSS 与删除 OSS 对象接口
- 已创建 `.env.example` 与可运行 `.env`
- 已补充 `pnpm build` 生产构建脚本
- 已补充 Dockerfile 与 docker-compose.yml，支持容器化部署
- 已通过 `pnpm build`
- 已通过 `pnpm typecheck`
- 已通过 `docker compose config` 与 `docker compose build`
- 已完成本地 HTTP 验证与真实 OSS 上传/删除烟测
- 已处理 VS Code 中 `@koa/router` 上下文类型无法识别 `ctx.request.files` 的诊断

## 已实现接口

- `GET /health`
- `POST /api/auth/token`
- `POST /api/oss/upload`
- `DELETE /api/oss/object`

## 本地运行

```bash
pnpm dev
```

## 生产构建运行

```bash
pnpm build
pnpm start
```

## Docker Compose 运行

```bash
docker compose up -d --build
```

当前本地服务已在 `http://localhost:9512` 启动。

## 注意事项

- `.env` 中已配置真实 OSS AccessKey 和 Bucket。
- Docker Compose 会读取 `.env`，不要将 `.env` 提交到仓库。
- `AUTH_CLIENTS` 当前只有 demo 调用方，可按 JSON 数组追加更多调用方。
- `POST /api/auth/token` 使用请求头 `x-client-id` 和请求体 `{ "sign": string }`，不再接收明文 `clientSecret`。
- `sign` 生成规则为 `HMAC-SHA256(clientId, clientSecret)`，输出 `base64url`。
- TOKEN 使用 HMAC SHA-256 签名，载荷包含 `clientId`、签发时间、过期时间和 token id。
- 上传接口字段名为 `file`，可选传路径式 `objectKey`，最终 OSS 对象路径为 `clientId/objectKey`。
- 上传接口可选传 `randomFilename=true`，服务会保留目录和扩展名，只随机重写最后一级文件名。
- 删除接口同样按当前 `clientId` 目录收口，传相对路径或接口返回的完整 `clientId/objectKey` 都可删除当前调用方目录下的对象。
- 上传路由通过 `readRequestFiles` 对 `koa-body` 的 `files` 类型做收口，避免 IDE 中 `ctx.request.files` 被 `@koa/router` 类型覆盖。
