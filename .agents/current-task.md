# 当前任务

- 日期：2026-07-07
- 需求：排查并修复 Docker Compose 构建后版本信息残缺的问题。
- 状态：已完成，已通过 admin typecheck/build 和 `docker compose build ali-oss-server`，本次触碰文件未检测到 UTF-8 BOM。
- 方案：Docker 构建阶段复制完整源码上下文，保留最小 `.git` 元数据和 `CHANGELOG.md`；Vite 版本注入优先读取构建参数，其次解析 `.git/HEAD`，最后回退到 git CLI / `unknown`。

## 计划

1. [x] 定位 Docker 构建阶段缺失 `CHANGELOG.md` 和 git 信息的原因。
2. [x] 调整 Docker 构建上下文和 Vite git hash 读取逻辑。
3. [x] 运行本地 admin typecheck/build。
4. [x] 运行 Docker Compose 构建并检查镜像内版本元数据。
