# 已完成任务：OSS 对象路径改为 clientId/文件名

## 完成时间

2026-06-24

## 需求

- OSS Bucket 中的上传地址应为 `clientId/文件名`，例如 `cine-stream/a.png`。
- 不再保留调用方传入的子目录。

## 实现摘要

- 上传接口的 `objectKey` 改为文件名语义，不允许包含 `/` 或 `\`。
- 未传 `objectKey` 时使用上传文件原始文件名。
- 删除接口接受 `文件名` 或接口返回的 `clientId/文件名`。
- 移除不再需要的 `OSS_UPLOAD_DIR` 配置。
- 更新 README、交接记录和架构决策。

## 验证

- `pnpm typecheck` 通过。
- 真实 OSS 烟测通过：上传返回 `cine-stream/a-...txt`，随后删除同一对象成功。
- 传入 `uploads/a.png` 会返回 `400 INVALID_OBJECT_KEY`。
