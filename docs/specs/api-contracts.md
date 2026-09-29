# API、认证与对象隔离契约

## 目标

本规范描述当前 server 与 Node SDK 必须保持的外部行为。它不是完整 OpenAPI，而是修改认证、上传、对象路径和 SDK 时必须维护的 invariant。

## 1. 调用方认证

### 换取 token

`POST /api/auth/token`

- 请求头必须包含 `x-client-id`。
- 请求体只接收签名字段 `{ "sign": string }`，不接收明文 clientSecret。
- 签名规则：`HMAC-SHA256(clientId, clientSecret)`，输出 `base64url`。
- server 按 clientId 从当前运行态 auth client 列表取 clientSecret，并使用常量时间比较验证签名。
- 成功后签发短期 client bearer token。

### client token invariant

- token issuer 固定为 `ali-oss-server`。
- client token 的 subject 是 clientId。
- token 使用根环境变量 `TOKEN_SECRET` 做 HS256 HMAC 签名。
- 当前签发 token 携带签发时 clientSecret 的 SHA-256 指纹。
- 验证 token 时，clientId 必须仍存在；若 client 被删除，token 立即失效。
- clientSecret 被重置后，旧 secret 指纹不再匹配，旧 token 失效。
- token 过期必须返回未授权错误，不能静默续期。

SDK 可以缓存 token，但必须在临近过期时重新换取；服务端始终是有效性事实源。

## 2. Admin 认证

`POST /api/admin/auth/login`

- 管理员账号密码来自根 `.env` 的 `ADMIN_USERNAME`、`ADMIN_PASSWORD`。
- 登录成功签发独立 `kind=admin` bearer token。
- admin token 不能当作 client token 使用，反之亦然。

Admin token 保护以下动态配置与 OSS 管理接口：

- `GET/POST /api/admin/auth-clients`
- `PUT/DELETE /api/admin/auth-clients/:clientId`
- `GET/PUT /api/admin/ip-allowlist`
- `GET/PUT /api/admin/rate-limit`
- `GET /api/admin/oss/objects`
- `POST /api/admin/oss/upload`
- `GET /api/admin/upload-config`

## 3. 业务 OSS 对象隔离

业务上传和删除必须被 server 收口到当前 token 的 `clientId/` 目录。

示例：clientId 为 `partner-a`，调用方传 `uploads/a.png`，最终对象为：

```text
partner-a/uploads/a.png
```

调用方即使传入 `partner-a/uploads/a.png`，也只表示同一相对对象，不应形成重复前缀。

对象 key 规则：

- 不能是空值。
- `.`、`..` 不能作为路径段。
- 不能包含控制字符。
- 反斜杠会按路径分隔符归一化。
- 最终 UTF-8 字节长度不得超过 1023。
- `randomFilename=true` 只随机化最后一级文件名，保留目录和扩展名。

不得通过业务 API 越过当前 clientId 目录访问其他调用方对象。

## 4. 上传接口

### Multipart

`POST /api/oss/upload`

- 鉴权：client bearer token。
- multipart 文件字段：`file`。
- 可选字段：`objectKey`、`randomFilename`。
- 最大文件大小由 `UPLOAD_MAX_FILE_SIZE_MB` 决定。
- server 使用临时文件交给 ali-oss，结束后 best-effort 清理临时文件。

### Raw stream

`POST /api/oss/upload-stream`

- 鉴权：client bearer token。
- 请求体必须是原始二进制流。
- 明确拒绝 `multipart/form-data`、`application/json`、`application/x-www-form-urlencoded`。
- 可选请求头：`x-file-name`、`x-object-key`、`x-random-filename`、`content-length`。
- server 既检查声明的 Content-Length，也通过计数 Transform 对实际流量做大小兜底限制。
- 上传实现使用 ali-oss `putStream`，不能先把整个流读入内存再上传。

## 5. 删除

`DELETE /api/oss/object`

- 鉴权：client bearer token。
- JSON 请求体包含 `objectKey`。
- 与上传相同，最终删除路径必须被限制在当前 clientId 目录。

## 6. Admin OSS 行为

Admin OSS 权限与业务 client 隔离不同：

- `POST /api/admin/oss/upload` 使用 admin token，并按传入 objectKey 直接定位 bucket 对象，不自动增加 clientId。
- `GET /api/admin/oss/objects` 使用 OSS ListObjectsV2。
- 分页使用 `continuationToken` / `nextContinuationToken`，不伪造总数。
- `maxKeys` 必须是 1–1000。
- prefix 为空时应省略 OSS 查询参数，避免签名差异问题。

这是管理员管理整个 bucket 的显式权限边界，不应复用为普通业务权限。

## 7. SDK 兼容性

公开包：`@ali-oss-server/sdk`。

- 支持 Node >= 20。
- 包根 `exports["."]` 是公开入口；内部文件不是公共兼容承诺。
- 公开客户端为 `AliOssServerSdk` / `createAliOssServerSdk`。
- SDK 不持有阿里云 AccessKey；只持有 ali-oss-server 的 clientId/clientSecret。
- SDK 内部拆分时，NodeNext 相对导入继续使用 `.js` 后缀。
- 未明确声明 breaking change 时，不改变已有根导出、调用参数与返回语义。

## 8. 安全信息

禁止提交或在文档/日志中回显：

- `.env` 的真实 TOKEN_SECRET、管理员密码、OSS AccessKey。
- `data/runtime-state.json` 中的 clientSecret。
- 真实业务 bearer/admin token。

涉及认证、权限、对象隔离和持久化 secret 的改动至少需要独立 review。
