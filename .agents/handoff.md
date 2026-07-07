# 交接记录：Koa + TypeScript OSS 服务

## 当前状态

- 已完成 Koa Web 服务实现
- 已完成多调用方 client 签名换取 TOKEN
- 已完成上传文件到 OSS 与删除 OSS 对象接口
- 已新增直接读取原始请求体的流式上传接口
- 已调整为 monorepo，拆分为 `apps/server` 与 `apps/admin`
- 已新增 React + MUI 管理端，并由后端托管静态资源
- 已新增管理员登录、动态 IP 限制和全局/接口级接口限流
- 已新增管理端 OSS Bucket 分页查询能力，基于 ListObjectsV2 和 continuationToken 翻页
- 已新增管理端文件上传能力，支持点击/拖拽选文件、编辑目录和目标文件名
- 已为管理端接入 `react-router-dom`，各 tab 挂载到 `/admin/ip-allowlist`、`/admin/rate-limit`、`/admin/bucket-objects`、`/admin/upload`
- Bucket 查询前缀已同步到动态路径，例如 `/admin/bucket-objects/uploads/images/`；每页数量同步到 `maxKeys` 查询参数。
- 直接访问 Bucket 查询 URL 会按 URL 条件自动查询；前缀输入作为草稿，点击“查询”后才写入动态路径。
- 管理端构建期会注入版本信息：`__APP_NAME__`、`__APP_VERSION__`、`__GIT_SHA__`，并在 HTML 中写入 `app-name`、`app-version`、`git-sha`、`build-time` meta；顶部栏展示版本号和 git short SHA。
- 管理端新增版本日志页 `/admin/version-log`，展示当前版本、Git Hash、构建时间、应用名称和由根目录 `CHANGELOG.md` 注入的 changelog。
- 已新增本地 skill `.agents/skills/maintain-changelog`，用于维护 `CHANGELOG.md` 的发布粒度、格式、归档和更新规则。
- 已为动态 IP 限制和限流配置新增本地 JSON 文件持久化
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
- `POST /api/oss/upload-stream`
- `DELETE /api/oss/object`
- `POST /api/admin/auth/login`
- `GET /api/admin/oss/objects`
- `POST /api/admin/oss/upload`
- `GET /api/admin/ip-allowlist`
- `PUT /api/admin/ip-allowlist`
- `GET /api/admin/rate-limit`
- `PUT /api/admin/rate-limit`

## 本地运行

```bash
pnpm dev
```

- 管理端 Vite 开发地址默认是 `http://localhost:5173`

## 生产构建运行

```bash
pnpm build
pnpm start
```

- 生产环境管理端访问地址为 `http://localhost:9512/admin`
- 管理端支持子路由直接访问，例如 `http://localhost:9512/admin/rate-limit`
- Bucket 查询可通过 URL 带入前缀和每页数量，例如 `http://localhost:9512/admin/bucket-objects/uploads/?maxKeys=50`

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
- 管理员账号密码从 `.env` 中的 `ADMIN_USERNAME`、`ADMIN_PASSWORD` 读取，登录后签发独立 admin token。
- `GET /api/admin/oss/objects` 仅接受 admin token，支持 `prefix`、`delimiter`、`maxKeys` 和 `continuationToken` 查询当前配置的 Bucket；`maxKeys` 限制为 1 到 1000。
- OSS ListObjectsV2 不返回总数，管理端通过服务端返回的 `nextContinuationToken` 做下一页，并用本地 token 栈支持上一页。
- 管理端上传使用 admin token，和业务调用方 `clientId` 无关。
- `POST /api/admin/oss/upload` 接收 multipart 字段 `objectKey`、`file`，直接上传到指定 OSS 对象路径；`objectKey=file.png` 表示 Bucket 根路径下的 `file.png`。
- 业务上传接口字段名为 `file`，可选传路径式 `objectKey`，最终 OSS 对象路径为 `clientId/objectKey`。
- 上传接口可选传 `randomFilename=true`，服务会保留目录和扩展名，只随机重写最后一级文件名。
- 流式上传接口使用原始二进制请求体，不接收 `multipart/form-data`；元数据通过 `x-file-name`、`x-object-key`、`x-random-filename` 请求头传递。
- 流式上传接口会先检查 `Content-Length`，并在服务端用计数流兜底限制文件大小；超限时返回 `413 FILE_TOO_LARGE`。
- 动态 IP 限制使用内存级 allowlist；列表为空时不限制访问 IP。
- 接口限流支持全局规则和接口级规则，按来源 IP 计数，两者都未设置时不限流。
- 动态 IP 限制和限流配置会持久化到根目录 `data/runtime-state.json`；Docker Compose 已挂载 `./data:/app/data`。
- 后端在生产环境通过 `/admin` 托管 `apps/admin/dist` 静态资源。
- 后端对无扩展名的 `/admin/*` 请求回退到 `index.html`，支持管理端 BrowserRouter 子路由刷新。
- 删除接口同样按当前 `clientId` 目录收口，传相对路径或接口返回的完整 `clientId/objectKey` 都可删除当前调用方目录下的对象。
- 上传路由通过 `readRequestFiles` 对 `koa-body` 的 `files` 类型做收口，避免 IDE 中 `ctx.request.files` 被 `@koa/router` 类型覆盖。
