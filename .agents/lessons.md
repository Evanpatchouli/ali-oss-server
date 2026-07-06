# 技术经验

## Koa multipart 上传到 ali-oss

- `koa-body` 开启 `multipart: true` 后，文件信息在 `ctx.request.files`。
- ali-oss 本地文件上传按官方文档使用 `client.put(objectKey, localFilePath, options)`。
- ali-oss 流式上传可用 `client.putStream(objectKey, stream, options)`，适合直接消费原始请求体。
- ali-oss 删除单个对象按官方文档使用 `client.delete(objectKey)`。
- `objectKey` 不应包含 Bucket 名，只包含对象路径。
- 多调用方隔离时，服务层应统一拼接 `clientId/objectKey`，不要信任调用方自己传完整隔离目录。
- `@koa/router` 的 `RouterContext` 会把 `ctx.request` 收窄，可能导致 VS Code 不能识别 `koa-body` 增强的 `request.files`；可以用一个小函数显式把 `ctx.request` 收口为带 `files` 的请求类型。
- `koa-body` 的全局解析会消耗 `application/json`、`application/x-www-form-urlencoded` 和 `multipart/form-data` 请求体；如果某个接口要直接读取 `ctx.req`，就应该限制它只接受原始流式内容类型。
- `@types/ali-oss` 中 `putStream` 的 `mime` 类型声明偏严格，实际调用可按需传入并在本地做窄范围类型兼容。
- monorepo 下若服务端包不在仓库根目录，`dotenv.config()` 需要显式指定根级 `.env` 路径，否则会默认读取包目录下的 `.env`。
- MUI 9 的 `Stack` 类型对系统属性收口更严格，`justifyContent`、`alignItems`、`flexWrap` 等布局值应通过 `sx` 传入更稳妥。
- 需要简单持久化运行时配置时，用本地 JSON 文件比引入数据库更合适；只要启动加载、变更即落盘、坏文件回退默认即可满足管理后台场景。
- 管理端 token 和业务调用方 token 分离时，管理端不能直接复用业务上传接口；若需求不涉及调用方隔离，应新增 admin 鉴权入口，并让它直接上传到指定 OSS 对象路径。

## pnpm 与 tsx

- 安装 `tsx` 后，pnpm 可能提示 `esbuild` 构建脚本被忽略；本项目实际运行 `pnpm start` 与 `pnpm typecheck` 均正常。
- pnpm 11 的构建脚本审批配置应写在 `pnpm-workspace.yaml` 的 `allowBuilds` 中，例如 `esbuild: true`；`package.json` 中旧的 `pnpm.onlyBuiltDependencies` 不再生效。
- TypeScript 6 在启用 `outDir` 构建时可能要求显式声明 `rootDir`，本项目应固定为 `src`，确保输出到 `dist` 的目录布局稳定。
- pnpm workspace 根脚本适合串联 `pnpm --filter <pkg> build` 与 `typecheck`，便于控制多包构建顺序。
