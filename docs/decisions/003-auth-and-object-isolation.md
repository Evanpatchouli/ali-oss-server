# ADR-003: client HMAC 换 token 与 clientId 对象隔离

- Status: accepted
- Date: 2026-09-29（根据现有实现整理）

## Context

ali-oss-server 需要支持多个业务调用方，但不能把阿里云 AccessKey 暴露给调用方；不同调用方写入同一 bucket 时还需要对象路径隔离。

## Decision

- 每个调用方使用 `clientId/clientSecret`。
- 调用方发送 `HMAC-SHA256(clientId, clientSecret)` 的 base64url 签名换取短期 bearer token。
- token 由服务端 `TOKEN_SECRET` 签名，载荷区分 client/admin 类型。
- client token 绑定 clientId，并带签发时 clientSecret 指纹；删除 client 或重置 secret 可撤销既有 token。
- 业务上传/删除最终 object key 强制位于 `clientId/` 目录。
- admin token 与 client token 分离；admin OSS 管理接口允许直接操作 bucket object key。

## Alternatives considered

- 调用方直接使用 OSS AccessKey：泄露云凭证且权限边界更难控制。
- 请求直接携带 clientSecret：会增加 secret 在业务请求中的暴露面。
- 仅靠调用方自行拼 clientId 前缀：无法形成服务端安全边界。
- 引入 JWT 依赖：当前需求可由 Node 内置 crypto 完成，没有必要增加依赖。

## Consequences

- server 成为认证与对象命名的可信边界。
- 修改 token payload、client 管理或 object-key 归一化都可能形成安全兼容性影响。
- Admin 是更高权限域，不能把 admin 路由无意暴露给 client token。
- clientSecret 仍以明文保存在本地运行态文件中，因此文件系统权限是整体安全模型的一部分。

## Validation / follow-up

认证/对象隔离改动应验证：错误签名、token 过期、client 删除、secret 重置、跨 client object key 尝试、admin/client token 混用。
