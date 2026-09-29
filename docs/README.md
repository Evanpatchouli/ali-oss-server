# Documentation map

本目录是 ali-oss-server 的长期项目知识库。非平凡任务先读本页和 `context/README.md`，再读取与当前工作单元直接相关的少量文档。

| 目录 | 当前内容 | 不保存什么 |
| --- | --- | --- |
| `context/` | server/admin/sdk/build 的代码入口、检索关键词和关联文档 | 大段复制源码 |
| `architecture/` | monorepo 边界、运行时数据流、认证与 OSS 状态边界 | 一次性任务过程 |
| `specs/` | API、认证、对象隔离和兼容性契约 | 具体实现步骤 |
| `decisions/` | 已确认的关键架构决策与 trade-off | 未落地想法 |
| `runbooks/` | 本地开发、验证、Docker 部署和恢复步骤 | 架构讨论 |
| `knowledge/` | 框架/依赖/项目特有且会重复用到的经验 | 当前任务日志 |
| `exec-plans/` | 长周期、多阶段任务的持久化计划 | 简单 TODO |

## 快速入口

- 想知道“代码在哪”：`context/README.md`
- 想知道“系统怎么组成”：`architecture/README.md`
- 修改 auth / token / object key / OSS API：`specs/api-contracts.md`
- 修改状态持久化或模块边界：先看 `decisions/README.md`
- 要启动、验证、部署：`runbooks/`
- 遇到 Koa、ali-oss、pnpm、SDK 模块化等已知坑：`knowledge/README.md`

事实优先级：当前代码/配置与可重复运行结果 > 正式文档 > 历史 `.agents/` 记录 > 聊天历史。
