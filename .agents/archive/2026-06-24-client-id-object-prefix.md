# 已完成任务：OSS 对象路径按 clientId 分目录

## 完成时间

2026-06-24

## 需求

- 上传到 OSS Bucket 的对象路径以当前调用方的 `clientId` 作为目录前缀。

## 实现摘要

- 上传接口从 TOKEN 中读取当前 `clientId` 并传入 OSS 服务层。
- OSS 服务层统一生成 `clientId/objectKey` 形式的对象路径。
- 删除接口同样按当前 `clientId` 目录收口，支持传相对路径或上传接口返回的完整路径。
- 更新 README、交接记录和架构决策。

## 验证

- `pnpm typecheck` 通过。
- 真实 OSS 烟测通过：上传返回 `cine-stream/uploads/smoke-tests/...`，随后删除同一对象成功。
