# Specs

这里记录 ali-oss-server **应该做什么**，用于约束对外 API、认证、安全边界和 SDK 兼容性。

当前核心规范：

- [API、认证与对象隔离契约](./api-contracts.md)

修改以下内容前必须先读对应规范，并在行为变化时同步更新：

- `/api/auth/*`、`/api/oss/*`、`/api/admin/*`
- bearer token 格式/失效语义
- clientId/objectKey 隔离
- 上传大小/Content-Type 约束
- SDK 公开 API 或响应结构

能由自动化测试表达的行为应优先进入测试；当前仓库尚未建立测试套件，因此重要行为至少需要 typecheck/build 和定向 smoke 验证，见 `../runbooks/testing.md`。
