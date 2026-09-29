# Architecture Decision Records

本目录记录当前实现中已经成立、未来可能被重新讨论的关键决策。v3 接入前的详细历史仍保留在根 `.agents/decisions.md`；这里开始作为长期 canonical 决策入口。

| ADR | 状态 | 主题 |
| --- | --- | --- |
| [001](./001-monorepo-and-admin-hosting.md) | accepted | pnpm monorepo + server 托管 admin |
| [002](./002-runtime-state-json.md) | accepted | 动态配置使用本地 JSON 状态，不引入数据库 |
| [003](./003-auth-and-object-isolation.md) | accepted | client HMAC 换 token + clientId 对象隔离 |

新增 ADR 建议包含：Status、Context、Decision、Alternatives considered、Consequences、Validation/Follow-up、Date。

当前结构事实写在 `../architecture/`，行为契约写在 `../specs/`。
