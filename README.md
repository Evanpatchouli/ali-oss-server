# ali-oss-server

基于 Koa、TypeScript、ali-oss 的 OSS 文件服务，现已调整为 monorepo，并新增 React + MUI 管理端。

## 目录

```text
apps/
  admin/   Vite 8 + React 19 + MUI 管理端
  server/  Koa + TypeScript OSS 服务
```

## 功能

- 调用方签名换取业务 Bearer Token
- OSS 文件上传、流式上传、删除
- 管理员账号密码登录管理端
- 动态 IP 限制
- 全局接口限流
- 接口级限流
- 后端生产环境托管管理端静态资源，访问地址为 `/admin`

## 启动

安装依赖：

```bash
pnpm install
```

开发模式：

```bash
pnpm dev
```

- 后端默认运行在 `http://localhost:9512`
- 管理端 Vite 开发服务器默认运行在 `http://localhost:5173`
- Vite 已代理 `/api` 和 `/health` 到后端

生产构建：

```bash
pnpm build
pnpm start
```

生产模式下由后端托管管理端静态资源：

- 业务接口：`http://localhost:9512/api/...`
- 管理端：`http://localhost:9512/admin`

类型检查：

```bash
pnpm typecheck
```

Docker Compose 启动：

```bash
docker compose up -d --build
```

Docker Compose 会读取当前目录的 `.env`，并将主机 `${PORT:-9512}` 端口映射到容器内 `${PORT:-9512}` 端口。

## 环境变量

复制 `.env.example` 为 `.env` 后填写真实配置。

| 变量 | 说明 |
| --- | --- |
| `PORT` | 服务端口，默认示例为 `9512` |
| `AUTH_CLIENTS` | 调用方凭证数组，JSON 格式 |
| `TOKEN_SECRET` | Bearer Token HMAC 签名密钥，至少 16 个字符 |
| `TOKEN_EXPIRES_IN_SECONDS` | 业务 Token 与管理端 Token 的有效期，单位秒 |
| `ADMIN_USERNAME` | 管理端登录账号 |
| `ADMIN_PASSWORD` | 管理端登录密码 |
| `OSS_REGION` | Bucket 所在地域，例如 `oss-cn-hangzhou` |
| `OSS_BUCKET_NAME` | Bucket 名称 |
| `OSS_ACCESS_KEY_ID` | 阿里云 AccessKey ID |
| `OSS_ACCESS_KEY_SECRET` | 阿里云 AccessKey Secret |
| `OSS_SECURE` | 是否使用 HTTPS 访问 OSS |
| `UPLOAD_MAX_FILE_SIZE_MB` | 单文件上传大小限制 |

`AUTH_CLIENTS` 示例：

```env
AUTH_CLIENTS=[{"clientId":"demo-client","clientSecret":"demo-secret"},{"clientId":"partner-a","clientSecret":"partner-a-secret"}]
```

## 管理端

### 登录

- 生产访问地址：`/admin`
- 使用 `.env` 中的 `ADMIN_USERNAME`、`ADMIN_PASSWORD` 登录
- 登录后可管理动态 IP 限制和接口限流

### 动态 IP 限制

- 使用内存级 `allowlist`
- 列表为空时，不限制访问 IP
- 列表非空时，仅允许列表中的 IP 访问服务
- 重启服务后，配置会恢复默认状态

### 接口限流

- 使用内存级限流配置
- 支持全局限流：`windowMs` + `maxRequests`
- 支持接口级限流：按 `HTTP 方法 + 路径` 精确匹配
- 全局限流和接口级限流可以同时生效，任一规则触发都会返回 `429`
- 如果全局和接口级都未设置，则不限流
- 当前限流按来源 IP 计数
- 重启服务后，配置会恢复默认状态

## 接口

### 健康检查

```bash
curl http://localhost:9512/health
```

### 获取业务 TOKEN

`sign` 生成规则：

```text
sign = HMAC-SHA256(clientId, clientSecret)，输出为 base64url
```

Node.js 示例：

```bash
node -e "console.log(require('node:crypto').createHmac('sha256', 'demo-secret').update('demo-client').digest('base64url'))"
```

```bash
curl -X POST http://localhost:9512/api/auth/token \
  -H "x-client-id: demo-client" \
  -H "Content-Type: application/json" \
  -d '{"sign":"<sign>"}'
```

响应中的 `accessToken` 用于访问上传和删除接口。

### 管理员登录

```bash
curl -X POST http://localhost:9512/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"<password>"}'
```

响应中的 `accessToken` 用于访问管理端配置接口。

### 查询动态 IP 限制

```bash
curl http://localhost:9512/api/admin/ip-allowlist \
  -H "Authorization: Bearer <adminAccessToken>"
```

### 更新动态 IP 限制

```bash
curl -X PUT http://localhost:9512/api/admin/ip-allowlist \
  -H "Authorization: Bearer <adminAccessToken>" \
  -H "Content-Type: application/json" \
  -d '{"ips":["127.0.0.1","::1"]}'
```

传空数组可关闭 IP 限制：

```bash
curl -X PUT http://localhost:9512/api/admin/ip-allowlist \
  -H "Authorization: Bearer <adminAccessToken>" \
  -H "Content-Type: application/json" \
  -d '{"ips":[]}'
```

### 查询限流配置

```bash
curl http://localhost:9512/api/admin/rate-limit \
  -H "Authorization: Bearer <adminAccessToken>"
```

### 更新限流配置

```bash
curl -X PUT http://localhost:9512/api/admin/rate-limit \
  -H "Authorization: Bearer <adminAccessToken>" \
  -H "Content-Type: application/json" \
  -d '{
    "globalRule": { "windowMs": 60000, "maxRequests": 120 },
    "routeRules": [
      { "method": "POST", "path": "/api/oss/upload", "windowMs": 60000, "maxRequests": 20 },
      { "method": "POST", "path": "/api/oss/upload-stream", "windowMs": 60000, "maxRequests": 10 }
    ]
  }'
```

关闭全局限流并清空接口级限流：

```bash
curl -X PUT http://localhost:9512/api/admin/rate-limit \
  -H "Authorization: Bearer <adminAccessToken>" \
  -H "Content-Type: application/json" \
  -d '{ "globalRule": null, "routeRules": [] }'
```

### multipart 上传文件

```bash
curl -X POST http://localhost:9512/api/oss/upload \
  -H "Authorization: Bearer <accessToken>" \
  -F "file=@/path/to/file.png" \
  -F "objectKey=uploads/file.png" \
  -F "randomFilename=false"
```

服务会自动在对象路径前追加当前 TOKEN 所属调用方的 `clientId` 目录。以上示例最终会上传到 `demo-client/uploads/file.png`。

如果不传 `objectKey`，服务会使用上传文件的原始文件名，例如 `demo-client/file.png`。

`objectKey` 允许路径式写法，但最终都会被限制在当前 `clientId` 目录下。传 `uploads/file.png` 或接口返回的完整 `demo-client/uploads/file.png` 都表示同一个对象。

`randomFilename=true` 时，服务会保留目录和扩展名，只把最后一级文件名改成随机字符串。例如 `uploads/file.png` 会上传到 `demo-client/uploads/<random>.png`。

### 流式上传文件

```bash
curl -X POST http://localhost:9512/api/oss/upload-stream \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/octet-stream" \
  -H "x-file-name: file.png" \
  -H "x-object-key: uploads/file.png" \
  -H "x-random-filename: false" \
  --data-binary "@/path/to/file.png"
```

这个接口直接读取原始请求体并流式上传到 OSS，不走服务器临时文件路径。

- 请求体必须是原始二进制流，不能使用 `multipart/form-data`
- 推荐设置 `Content-Type: application/octet-stream` 或真实文件 MIME
- `x-file-name` 可选；未传 `x-object-key` 时，会用它推导文件名
- `x-object-key` 可选；规则与 `/api/oss/upload` 一致
- `x-random-filename` 可选；`true` 时保留目录和扩展名，只随机化最后一级文件名
- 同样会自动在对象路径前追加当前 TOKEN 所属调用方的 `clientId` 目录

### 删除文件

```bash
curl -X DELETE http://localhost:9512/api/oss/object \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{"objectKey":"uploads/file.png"}'
```

删除接口同样限定在当前 `clientId` 目录下。传 `uploads/file.png` 或接口返回的完整 `demo-client/uploads/file.png` 都会删除同一个对象。
