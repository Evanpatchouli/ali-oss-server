# 已完成任务：补充 build 与 Docker Compose

## 目标

- 为项目补充生产构建脚本。
- 为项目补充 Dockerfile 与 docker-compose.yml，支持容器化启动。
- 同步 README 与忽略规则。

## 完成内容

- `package.json` 增加 `build`，生产 `start` 改为运行 `dist/index.js`，源码直跑保留为 `start:ts`。
- `tsconfig.json` 增加 `rootDir: "src"`，满足 TypeScript 6 构建要求。
- 新增 Dockerfile，使用多阶段构建产出生产镜像。
- 新增 docker-compose.yml，读取 `.env` 并按 `${PORT:-9512}` 映射端口。
- 新增 `.dockerignore`，避免发送 `.env`、`node_modules`、`dist`、`.git` 与 `.agents` 到 Docker 构建上下文。
- `.gitignore` 增加 `dist`。
- README 增加生产构建和 Docker Compose 启动说明。
- `pnpm-workspace.yaml` 设置 `allowBuilds.esbuild=true`，解决 pnpm 11 构建脚本审批阻断。

## 验证

- `pnpm build` 通过。
- `pnpm typecheck` 通过。
- `docker compose config` 通过。
- `docker compose build` 通过。
- 本次触碰文件已检查 UTF-8 无 BOM。
