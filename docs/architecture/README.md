# Architecture

## 系统概览

ali-oss-server 是一个 pnpm monorepo，把 OSS 服务、管理端和调用 SDK 放在同一仓库中：

```text
apps/
├── server/  Koa + TypeScript，认证、策略、OSS API、静态托管
├── admin/   Vite + React 19 + MUI 管理端
└── sdk/     纯 Node.js SDK，对业务认证与 OSS API 做封装
```

根 workspace 负责统一安装、开发、构建、类型检查和产品版本更新。

## 运行时边界

### Server

入口为 `apps/server/src/index.ts`：

1. 从根 `.env` 读取必需配置。
2. 调用 `initializeRuntimeState()` 加载 `data/runtime-state.json`。
3. 创建 Koa app。
4. 监听 `PORT`，默认 9512。

中间件顺序由 `app.ts` 明确：
`errorHandler -> IP allowlist -> rate limit -> koa-body -> routes -> admin static -> 404`。

### Admin

开发时由 Vite 运行在默认 5173，并代理 `/api`、`/health` 到 9512。

生产构建时生成 `apps/admin/dist`，由 server 在 `/admin` 下托管，并对无扩展名子路由回退 `index.html`。管理端使用 BrowserRouter，base 固定为 `/admin/`。

### SDK

`@ali-oss-server/sdk` 是独立可发布包。公开根入口是 `apps/sdk/src/index.ts`；主客户端实现位于 `client.ts`。SDK 负责：

- 通过 clientId/clientSecret 计算调用签名并获取短期 bearer token；
- 自动缓存/刷新 token；
- 封装 multipart、raw stream 上传与删除；
- 不直接持有 OSS AccessKey。

## 核心数据流

### 业务调用方

```text
SDK / caller
  -> HMAC(clientId, clientSecret)
  -> POST /api/auth/token
  -> server 查运行态 authClients
  -> 返回 client bearer token
  -> /api/oss/*
  -> authenticate client token
  -> objectKey 收口到 clientId/*
  -> Aliyun OSS
```

业务调用方不能直接访问 admin bucket list/upload 边界。

### Admin

```text
Browser
  -> POST /api/admin/auth/login
  -> admin bearer token
  -> /api/admin/*
     ├── auth clients
     ├── IP allowlist
     ├── rate limits
     └── bucket list / admin upload
  -> 状态变更写 data/runtime-state.json
```

Admin OSS 上传使用完整 bucket object key，不自动加 clientId 前缀；这是与业务调用方隔离模型不同的显式权限边界。

## 状态与持久化

当前没有数据库。

- 静态敏感配置：根 `.env`
- 动态状态：内存中的 auth clients / allowlist / rate limit
- 动态状态持久化：`data/runtime-state.json`
- 写入策略：先写 `runtime-state.tmp`，再 rename 原子替换
- Docker：`./data:/app/data` volume 保留运行态

运行态文件包含明文 clientSecret，因此属于敏感数据。

## 外部依赖

- Aliyun OSS：服务端通过 `ali-oss` 访问单一配置 bucket。
- 本项目没有数据库、Redis、Kafka 等外部状态组件。
- 容器部署只运行本应用；Compose 不声明额外依赖服务。

“为什么选择这些边界”见 `../decisions/`；对外行为和安全 invariant 见 `../specs/api-contracts.md`。
