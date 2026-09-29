# Knowledge

本页整理 v3 接入前 `.agents/lessons.md` 中仍与当前代码一致、未来容易重复踩到的稳定经验。历史原文继续保留，但后续新增长期经验写这里或拆成独立文档。

## Koa / 上传

- `koa-body` 的 multipart 文件位于 `ctx.request.files`；`@koa/router` 的 Context 类型可能把它收窄，当前项目用小型类型收口函数处理。
- 全局 body parser 会消费 JSON、urlencoded、multipart 请求体；需要直接读取 `ctx.req` 的 `upload-stream` 必须坚持 raw 内容类型边界。
- ali-oss 本地文件上传用 `client.put`，原始流上传用 `client.putStream`，单对象删除用 `client.delete`。
- `@types/ali-oss` 对部分 `putStream` 选项声明比运行时严格，若需兼容应做局部窄范围类型处理，不扩散 `any`。
- ListObjectsV2 在签名场景不要传无意义的空字符串查询参数；当前实现对空 prefix/delimiter/token 直接省略。

## 对象 key

- 业务对象隔离应由 server 服务层统一添加 `clientId/`，不能相信调用方自行隔离。
- objectKey 归一化既影响安全又影响兼容性；修改前先读 `docs/specs/api-contracts.md`。
- random filename 只改最后一级文件名，目录和扩展名保持不变。

## 状态持久化

- 对当前单实例、小配置量场景，本地 JSON + 启动加载 + 变更即落盘足够，不要无需求引入数据库。
- 写文件必须保持“临时文件 + rename”原子替换和失败回滚语义。
- 状态文件包含明文 clientSecret，文件权限、volume、备份和日志都属于安全边界。

## pnpm / TypeScript

- pnpm 11 的 install script 审批放在 `pnpm-workspace.yaml` 的 `allowBuilds`；当前 `esbuild: true`。
- TypeScript ESM/NodeNext 包拆分后，源码内部相对 import 使用 `.js` 后缀。
- SDK 的 `index.ts` 是公开 re-export 门面；内部拆分不等于可以改变 package 根 exports。

## Admin / Vite

- admin 生产 base 固定 `/admin/`，server 必须同时支持 SPA 子路由回退。
- 构建元数据的 Git Hash 优先读环境变量，其次读复制进构建上下文的 Git 元数据，最后才尝试执行 git。
- CHANGELOG 在构建期注入 admin；修改版本日志先读 `.agents/skills/maintain-changelog/`。

## 何时把经验升级成 ADR/spec

- 只是框架坑/排障技巧：保留在 Knowledge。
- 会影响公共行为、安全边界或兼容性：写 Spec。
- 涉及“为什么选择这种架构/存储/发布方式”：写 ADR。
