# 架构决策

## 多调用方凭证与服务端 TOKEN

- 使用 `.env` 中的 `AUTH_CLIENTS` 维护多组 `clientId` / `clientSecret`。
- `POST /api/auth/token` 只负责校验调用方凭证并签发服务端 TOKEN。
- 上传和删除接口只接受 `Authorization: Bearer <TOKEN>`。
- TOKEN 使用 Node.js 内置 `crypto` 做 HMAC SHA-256 签名，避免为当前简单需求额外引入 JWT 依赖。
- TOKEN 载荷保留 `clientId`，便于后续审计、限流或权限细分。

## OSS 对象操作

- 上传接口使用 `client.put(objectKey, localFilePath, options)`。
- 删除接口使用 `client.delete(objectKey)`。
- 服务层统一校验 `objectKey`，禁止空路径、相对路径片段和控制字符。
- OSS 对象路径按调用方隔离：上传和删除都会使用当前 TOKEN 中的 `clientId` 作为目录前缀，支持 `clientId/objectKey` 路径式结构。
- 上传接口的 `randomFilename=true` 只重写最后一级文件名，保留调用方提供的目录和原文件扩展名。
