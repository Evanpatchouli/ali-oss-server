# 已归档任务：新增流式上传接口

## 目标

- 保留现有 `POST /api/oss/upload` multipart 上传能力
- 新增一个不依赖服务器临时文件路径的流式上传接口
- 保持认证、对象路径约束和返回结构与现有接口一致

## 结果

- 新增 `POST /api/oss/upload-stream`
- 接口直接读取原始请求体并通过 OSS `putStream` 上传
- 新接口通过 `x-file-name`、`x-object-key`、`x-random-filename` 传递元数据
- 新接口显式拒绝 `multipart/form-data`、`application/json`、`application/x-www-form-urlencoded`
- 服务端新增流式大小限制，超限返回 `413 FILE_TOO_LARGE`
- README 已补充流式上传调用示例

## 验证

- `pnpm typecheck`
- `pnpm build`
