# 已归档任务：持久化 IP 限制和限流配置

## 目标

- 将动态 IP 限制和接口限流从纯内存态改为本地 JSON 文件持久化
- 启动时加载持久化状态
- 管理端每次保存配置时同步落盘
- 不引入数据库，保持实现简单

## 结果

- 新增 `runtime-state-service`，统一负责读取和写入 `data/runtime-state.json`
- 服务启动时自动加载持久化状态
- 管理端保存 IP allowlist 和限流配置时同步落盘
- Docker Compose 新增 `./data:/app/data` 挂载，容器重建后仍可保留状态
- 持久化文件缺失或损坏时，服务会打印日志并回退为空配置

## 验证

- `pnpm --filter @ali-oss-server/server build`
- 启动后保存配置，检查 `data/runtime-state.json`
- 重启服务后再次查询配置，确认自动恢复
