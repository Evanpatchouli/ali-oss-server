# Current Task

Status: complete

目标：支持 `.env` 多 bucket，共享 OSS 凭证，每个 bucket 独立 name/region；未指定 bucket 的请求默认第一个 bucket，兼容旧调用方。

Implementation Brief：

- `OSS_BUCKETS` JSON 数组作为唯一新配置；未提供时保留 `OSS_BUCKET_NAME`/`OSS_REGION` 单 bucket 配置。数组顺序决定默认 bucket，非法/空数组启动失败。
- OSS 请求支持 `x-oss-bucket` header；multipart/JSON 支持 `bucket` 字段。同值允许，冲突/空值/未知 bucket 拒绝，只有缺失才使用默认。
- 每个 bucket 固定独立 OSS client，service 操作和 URL 使用同一 client；保持 clientId 隔离与 token 撤销语义，不增加 bucket 授权模型。
- Admin 新增 `GET /api/admin/oss/buckets` 返回 `{ buckets: [{name, region}], defaultBucket }`；选择器影响 OSS list/upload，切换重置路径/分页并隔离迟到请求。
- SDK options/upload inputs 增加可选 bucket，deleteObject 保留 string 参数并增加可选 options；未配置时不发送 bucket，保持旧 server 兼容。

Work Units：

1. S1 execute / fast-worker：server 配置、client、协议、路由与定向回归。
2. S1 execute / fast-worker：SDK 可选 bucket 与消费/请求回归。
3. S1 execute / fast-worker：admin selector、请求参数与切换状态。
4. S1 execute：正式文档与 `.env.example` 同步；S0 verify：相关 typecheck/build/contract/protocol/SDK 验证。
5. Review：最终独立审查兼容性、并发、认证隔离和范围。

不修改真实 `.env` 或 runtime-state，不发布/提交，不做版本升级。

完成验证：server/admin/SDK typecheck 与 build；server protocol 6/6、contract 3/3；SDK consumer 1/1、upload-stream 7/7；改动文件 Prettier、diff whitespace 与 UTF-8 无 BOM 检查。使用假凭证与 mock OSS 的本地 Koa HTTP 和 Admin UI smoke 覆盖默认/指定 Bucket、目录切换、选择恢复、上传目标、上传中退出重登。独立 Reviewer 的测试环境隔离与上传会话竞态 finding 已修复并定向复核通过。未执行真实 OSS smoke。
