# 技术经验

## Koa multipart 上传到 ali-oss

- `koa-body` 开启 `multipart: true` 后，文件信息在 `ctx.request.files`。
- ali-oss 本地文件上传按官方文档使用 `client.put(objectKey, localFilePath, options)`。
- ali-oss 删除单个对象按官方文档使用 `client.delete(objectKey)`。
- `objectKey` 不应包含 Bucket 名，只包含对象路径。
- 多调用方隔离时，服务层应统一拼接 `clientId/objectKey`，不要信任调用方自己传完整隔离目录。
- `@koa/router` 的 `RouterContext` 会把 `ctx.request` 收窄，可能导致 VS Code 不能识别 `koa-body` 增强的 `request.files`；可以用一个小函数显式把 `ctx.request` 收口为带 `files` 的请求类型。

## pnpm 与 tsx

- 安装 `tsx` 后，pnpm 可能提示 `esbuild` 构建脚本被忽略；本项目实际运行 `pnpm start` 与 `pnpm typecheck` 均正常。
