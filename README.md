# ali-oss-server

基于 Koa、TypeScript、dotenv 和 ali-oss 的 OSS 文件服务。

## 启动

```bash
pnpm install
pnpm build
pnpm start
```

开发模式：

```bash
pnpm dev
```

生产构建：

```bash
pnpm build
pnpm start
```

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

复制 `.env.example` 为 `.env` 后填写真实 OSS 配置。

| 变量 | 说明 |
| --- | --- |
| `PORT` | 服务端口，默认示例为 `9512` |
| `AUTH_CLIENTS` | 调用方凭证数组，JSON 格式 |
| `TOKEN_SECRET` | TOKEN HMAC 签名密钥，至少 16 个字符 |
| `TOKEN_EXPIRES_IN_SECONDS` | TOKEN 有效期，单位秒 |
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

## 接口

### 健康检查

```bash
curl http://localhost:9512/health
```

### 获取 TOKEN

```bash
curl -X POST http://localhost:9512/api/auth/token \
  -H "Content-Type: application/json" \
  -d '{"clientId":"demo-client","clientSecret":"demo-secret"}'
```

响应中的 `accessToken` 用于访问上传和删除接口。

### 上传文件

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

### 删除文件

```bash
curl -X DELETE http://localhost:9512/api/oss/object \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{"objectKey":"uploads/file.png"}'
```

删除接口同样限定在当前 `clientId` 目录下。传 `uploads/file.png` 或接口返回的完整 `demo-client/uploads/file.png` 都会删除同一个对象。
