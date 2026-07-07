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
- 管理端 Bucket 查询使用 `client.listV2`，只挂在 admin 鉴权路由下，不开放给业务调用方 token。
- Bucket 查询分页沿用 OSS 的 `continuationToken` 机制；后端只返回当前页和 `nextContinuationToken`，不模拟总数。
- 服务层统一校验 `objectKey`，禁止空路径、相对路径片段和控制字符。
- OSS 对象路径按调用方隔离：上传和删除都会使用当前 TOKEN 中的 `clientId` 作为目录前缀，支持 `clientId/objectKey` 路径式结构。
- 上传接口的 `randomFilename=true` 只重写最后一级文件名，保留调用方提供的目录和原文件扩展名。
- 流式上传只接受原始请求体，不接受 `multipart/form-data`、`application/json`、`application/x-www-form-urlencoded`，避免被全局 body parser 消耗。
- 流式上传在进入 OSS SDK 前先校验 `Content-Length`，并用服务端计数流兜底限制上传体积。

## monorepo 与管理端

- 项目按 `apps/server` 和 `apps/admin` 拆分为 pnpm workspace。
- 生产环境由后端托管 `apps/admin/dist`，管理端访问路径固定为 `/admin`。
- 管理员鉴权使用 `.env` 中的 `ADMIN_USERNAME`、`ADMIN_PASSWORD`，登录后签发独立的 admin token。
- 管理端使用 BrowserRouter，basename 固定为 `/admin`；tab 状态由路径驱动，避免 UI 内部 tab state 与地址栏不同步。
- Bucket 查询页将 `prefix` 放入 `/admin/bucket-objects/*` 动态路径，将 `maxKeys` 放入 URL 查询参数，便于复制和恢复查询条件。
- Bucket 查询页进入时按 URL 条件自动加载数据；前缀输入不逐字触发查询，避免编辑过程产生多次请求。
- 管理端版本信息在 Vite 构建期注入，来源为 admin `package.json` 版本号、当前 git short SHA 和构建时间；UI 只展示短版本，完整构建时间放在版本 Chip 的 title 中。
- 版本日志页展示根目录 `CHANGELOG.md`，由 Vite 构建期作为 `__APP_CHANGELOG__` 注入前端，避免运行时额外请求静态文件。
- Changelog 维护规则沉淀为 `.agents/skills/maintain-changelog`，后续更新版本日志时优先按该 skill 的发布记录粒度执行。
- Docker 镜像构建不安装 git；管理端 Vite 配置优先读取 `GIT_SHA`/`VITE_GIT_SHA`，其次直接解析复制进构建上下文的 `.git/HEAD`、refs 或 packed-refs。

## 动态 IP 限制与限流

- 动态 IP 限制使用内存级 allowlist；列表为空时完全关闭 IP 限制。
- 接口限流使用内存级配置，按来源 IP 计数。
- 全局限流和接口级限流支持同时生效，只要任一规则触发就返回 `429`。
- 接口级限流按 `HTTP 方法 + 路径` 精确匹配，不做通配符和前缀规则。
- 动态 IP 限制和限流配置持久化到本地 `data/runtime-state.json`，不引入数据库。
- 配置写入采用“先写临时文件，再 rename 覆盖”的原子替换方式，避免半写入损坏。
- 启动读取持久化文件失败时仅记录日志并回退默认空配置，不阻塞服务启动。

## 生产构建与容器化

- 生产运行统一使用 `pnpm build` 编译到 `dist`，再通过 `node dist/index.js` 启动。
- 源码直跑保留为 `pnpm start:ts`，避免生产入口依赖 `tsx`。
- Docker 镜像采用多阶段构建：构建阶段安装完整依赖并执行 TypeScript 编译，运行阶段只安装生产依赖并复制 `dist`。
- Docker Compose 读取 `.env`，端口映射使用 `${PORT:-9512}:${PORT:-9512}`，确保容器内监听端口与应用配置一致。
