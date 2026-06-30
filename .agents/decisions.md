# 架构决策

## 多调用方凭证与服务端 TOKEN

- 使用 `.env` 中的 `AUTH_CLIENTS` 维护多组 `clientId` / `clientSecret`。
- `POST /api/auth/token` 只负责校验调用方签名并签发服务端 TOKEN。
- TOKEN 接口通过请求头 `x-client-id` 获取调用方标识，请求体只接收 `{ "sign": string }`。
- `sign` 使用 `HMAC-SHA256(clientId, clientSecret)` 生成，输出编码为 `base64url`，服务端按 `clientId` 查找配置中的 `clientSecret` 后重新计算并做常量时间比对。
- 上传和删除接口只接受 `Authorization: Bearer <TOKEN>`。
- TOKEN 使用 Node.js 内置 `crypto` 做 HMAC SHA-256 签名，避免为当前简单需求额外引入 JWT 依赖。
- TOKEN 载荷保留 `clientId`，便于后续审计、限流或权限细分。

## OSS 对象操作

- 上传接口使用 `client.put(objectKey, localFilePath, options)`。
- 流式上传接口使用 `client.putStream(objectKey, requestStream, options)`，避免依赖服务器临时文件路径。
- 删除接口使用 `client.delete(objectKey)`。
- 服务层统一校验 `objectKey`，禁止空路径、相对路径片段和控制字符。
- OSS 对象路径按调用方隔离：上传和删除都会使用当前 TOKEN 中的 `clientId` 作为目录前缀，支持 `clientId/objectKey` 路径式结构。
- 上传接口的 `randomFilename=true` 只重写最后一级文件名，保留调用方提供的目录和原文件扩展名。
- 流式上传只接受原始请求体，不接受 `multipart/form-data`、`application/json`、`application/x-www-form-urlencoded`，避免被全局 body parser 消耗。
- 流式上传在进入 OSS SDK 前先校验 `Content-Length`，并用服务端计数流兜底限制上传体积。

## 生产构建与容器化

- 生产运行统一使用 `pnpm build` 编译到 `dist`，再通过 `node dist/index.js` 启动。
- 源码直跑保留为 `pnpm start:ts`，避免生产入口依赖 `tsx`。
- Docker 镜像采用多阶段构建：构建阶段安装完整依赖并执行 TypeScript 编译，运行阶段只安装生产依赖并复制 `dist`。
- Docker Compose 读取 `.env`，端口映射使用 `${PORT:-9512}:${PORT:-9512}`，确保容器内监听端口与应用配置一致。
