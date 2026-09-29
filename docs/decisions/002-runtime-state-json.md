# ADR-002: 动态配置使用本地 JSON 状态

- Status: accepted
- Date: 2026-09-29（根据现有实现整理）

## Context

管理端需要运行时修改调用方 client、IP allowlist 和接口限流；当前服务是轻量单实例部署，没有数据库需求。

## Decision

- 动态配置保存在内存服务中，并同步持久化到 `data/runtime-state.json`。
- 状态包含 `authClients`、`ipAllowlist`、`rateLimit`。
- 写盘使用临时文件 + rename 原子替换。
- 写盘失败时恢复内存中的上一份快照。
- 启动读取缺失/无效状态时回退默认值，不因状态文件损坏阻塞进程启动。
- Docker Compose 挂载 `./data:/app/data`。
- 当前不引入 PostgreSQL、Redis 或其他状态服务。

## Alternatives considered

- 数据库：对当前单实例和配置量过重，会引入迁移、备份、连接管理。
- 只保存在内存：容器/进程重启会丢失 client 与策略配置。

## Consequences

优点：
- 部署简单，无额外服务。
- 配置变更立即生效且可跨重启保留。

风险：
- `runtime-state.json` 包含明文 clientSecret，必须保护文件权限、备份和日志输出。
- 多实例部署会产生状态一致性问题；在引入多副本前必须重新评估本决策。
- 修改持久化 schema 时需要明确向后兼容/迁移策略。

## Validation / follow-up

涉及 runtime-state 的变更至少验证：写入、失败回滚、重启读取、Docker volume 持久化以及旧状态兼容。
