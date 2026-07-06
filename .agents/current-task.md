# 当前任务

- 日期：2026-07-06
- 需求：在管理端和后端增加仅管理端可用的 OSS Bucket 分页查询。
- 状态：已完成，已通过 `pnpm typecheck`，本次触碰文件未检测到 UTF-8 BOM。
- 方案：基于 OSS ListObjectsV2 增加 admin 专用对象列表接口，前端新增 Bucket 查询页签并用 continuationToken 分页；后端省略空查询参数，避免 ali-oss V4 签名失败。

## 计划

1. [x] 查阅全局规则、历史方案和项目结构。
2. [x] 确认 OSS ListObjectsV2 参数和分页机制。
3. [x] 新增后端 admin 专用 Bucket 分页查询接口。
4. [x] 新增前端分页查询 API、类型和面板。
5. [x] 更新 README 并运行类型检查。
