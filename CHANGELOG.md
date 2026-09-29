# Changelog

## 1.2.0 - 2026-09-29

### Added

- 流式上传支持通过 `x-file-name-utf8` 安全传递 Unicode 文件名，兼容中文、重音字符和 emoji。
- 非法或冲突的流式上传文件名 header 会返回明确的 400 错误。

### Changed

- 明确并锁定业务 objectKey 的 clientId 隔离、上传返回最终 objectKey、对象 URL 与删除重试语义。

## 1.1.0 - 2026-07-07

### Added

- 新增管理端 Client 管理页，支持新增、删除和重置调用方 client 凭证。
- 新增管理端 client 凭证接口，配置会写入运行态状态文件并立即影响业务 token 签发。
- 管理端运行概览展示当前 client 数量。

### Changed

- 调用方 client 不再通过 `.env` 的 `AUTH_CLIENTS` 配置，改为通过管理端维护。
- 登录、刷新、Client 管理、限流、Bucket 查询和上传等后端交互按钮展示具体 loading 状态。

### Security

- 业务 token 会关联签发时的 clientSecret，删除 client 或重置密钥后可使相关业务 token 失效。

### Breaking

- 移除 `AUTH_CLIENTS` 环境变量；升级后需要先登录管理端创建 client，调用方才能换取业务 token。

## 1.0.1 - 2026-07-07

### Added

- 管理端文件上传页展示服务端最大上传大小限制，文件超限时提示并阻止提交。

### Changed

- Docker Compose 固定容器名为 `ali-oss-server`，默认网络名为 `ali-oss`，避免使用自动生成后缀。

### Fixed

- 修复 Docker 镜像中管理端 Git Hash 显示为 `unknown`、版本日志为空的问题。

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
