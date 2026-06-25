# 已完成任务：调整 token 接口签名认证

## 目标

- `POST /api/auth/token` 不再在请求体传明文 `clientId/clientSecret`。
- 调用方通过请求头 `x-client-id` 传 `clientId`。
- 请求体只传 `{ "sign": string }`。
- 服务端按 `clientId` 查找 `clientSecret`，对 `clientId` 做签名并比对 `sign`。

## 完成内容

- `src/routes/auth-routes.ts` 改为读取 `x-client-id` 请求头和请求体 `sign`。
- `src/services/auth-service.ts` 改为通过 `HMAC-SHA256(clientId, clientSecret)` 生成 `base64url` 签名，并使用常量时间比对。
- `src/utils/request.ts` 增加 `readRequiredHeader`，缺少 `x-client-id` 时返回 `INVALID_HEADER`。
- README 已更新 TOKEN 获取示例和签名生成规则。
- 架构决策与交接文档已同步。

## 验证

- `pnpm build` 通过。
- `pnpm typecheck` 通过。
- 本次触碰文件已检查 UTF-8 无 BOM。
