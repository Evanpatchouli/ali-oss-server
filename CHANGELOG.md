# Changelog

## 1.0.0 - 2026-07-07

### Added

- 管理端接入 React Router，各功能页签支持独立 URL。
- Bucket 查询支持通过动态路径保存前缀，并通过 `maxKeys` 查询参数保存每页数量。
- 直接访问 Bucket 查询 URL 时自动按 URL 条件加载数据。
- 管理端构建期注入版本信息，并在顶部栏展示当前版本号。
- 新增版本日志页，用于查看当前版本变更记录。
- 管理端新增 OSS Bucket 分页查询和文件上传能力。

### Changed

- Bucket 查询的前缀输入改为草稿模式，点击查询后再更新 URL 并加载数据。
- 对象路径列保持 OSS 对象路径原始大小写显示。

### Fixed

- 修复 Bucket 查询目录路径被 MUI Button 默认样式转为大写的问题。
