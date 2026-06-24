# 已完成任务：恢复路径式 objectKey 并支持随机文件名

## 完成时间

2026-06-25

## 需求

- `objectKey` 允许路径式，例如 `uploads/a.png`。
- 实际 OSS 对象路径始终拼接在当前 `clientId` 目录后，例如 `cine-stream/uploads/a.png`。
- 上传接口新增 `randomFilename` 参数，传 `true` 时用随机字符串重写最后一级文件名。

## 实现摘要

- 上传接口新增 `randomFilename` 解析，支持布尔值和 `"true"` / `"false"` 字符串。
- 服务层恢复路径式 `objectKey`，统一拼接 `clientId/objectKey`。
- 如果调用方传入完整 `clientId/objectKey`，服务不会重复拼接 `clientId`。
- `randomFilename=true` 时保留目录和扩展名，只重写最后一级文件名。
- 删除接口同步支持路径式相对路径和完整 `clientId/objectKey`。
- 更新 README、交接记录、经验记录和架构决策。

## 验证

- `pnpm typecheck` 通过。
- 真实 OSS 烟测通过：`uploads/smoke-tests/...` 上传为 `cine-stream/uploads/smoke-tests/...` 并删除成功。
- 真实 OSS 烟测通过：`randomFilename=true` 时重写最后一级文件名并保留 `.txt` 扩展名。
- 真实 OSS 烟测通过：传入完整 `cine-stream/uploads/smoke-tests/...` 不会重复拼接前缀。
