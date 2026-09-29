# Development runbook

## 环境

- 包管理器：根 `package.json` 固定 `pnpm@11.9.0`。
- 生产 Docker 基线：Node 24 Alpine。
- SDK 声明最低 Node 20。
- 本地开发推荐使用 Node 24，与容器运行时保持一致。

## 首次启动

```bash
corepack enable
pnpm install
cp .env.example .env
```

Windows 没有 `cp` 时直接复制 `.env.example` 为 `.env`。

填写以下变量：

- `PORT`（默认示例 9512）
- `TOKEN_SECRET`（至少 16 字符）
- `TOKEN_EXPIRES_IN_SECONDS`
- `ADMIN_USERNAME` / `ADMIN_PASSWORD`
- `OSS_REGION`
- `OSS_BUCKET_NAME`
- `OSS_ACCESS_KEY_ID` / `OSS_ACCESS_KEY_SECRET`
- `OSS_SECURE`
- `UPLOAD_MAX_FILE_SIZE_MB`

不要把真实 `.env` 提交到 Git。

## 开发模式

```bash
pnpm dev
```

默认：

- server: `http://localhost:9512`
- admin Vite: `http://localhost:5173/admin/`
- Vite 将 `/api`、`/health` 代理到 server

SDK 不需要常驻开发进程，按需单独 build/typecheck。

## 单包命令

```bash
pnpm --filter @ali-oss-server/server typecheck
pnpm --filter @ali-oss-server/server build

pnpm --filter @ali-oss-server/admin typecheck
pnpm --filter @ali-oss-server/admin build

pnpm --filter @ali-oss-server/sdk typecheck
pnpm --filter @ali-oss-server/sdk build
```

## 根命令

```bash
pnpm typecheck
pnpm build
pnpm format:check
pnpm format
```

`pnpm format` 会写文件，Agent 不应为了通过检查而格式化无关文件；优先只处理本任务触碰范围。

## 本地运行态

首次启动没有 `data/runtime-state.json` 时：

- auth client 列表为空；
- IP allowlist 为空；
- rate limit 为空。

需要先使用 admin 登录并创建业务 client，业务调用方才能换 token。

`data/runtime-state.json` 含明文 clientSecret，不要提交、复制到公开日志或发给 SubAgent。

## 常见注意事项

- server 的 dotenv 显式读取 workspace 根 `.env`，不要在 `apps/server` 再建立另一份配置事实源。
- pnpm 11 的构建脚本审批配置位于 `pnpm-workspace.yaml`；当前允许 `esbuild`。
- raw stream 上传必须避开会消费请求体的 JSON/urlencoded/multipart 解析语义；修改 `koa-body` 或中间件顺序时重点复核。
- admin Vite base 是 `/admin/`，改路由/静态托管时同时检查 server fallback。
