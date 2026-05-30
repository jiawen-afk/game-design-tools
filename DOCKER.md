# Docker 部署

## 目标

使用单个容器提供前端静态站点，不使用 nginx。

## 构建

```bash
docker build -t game-design-tools .
```

## 启动

```bash
docker run --rm -p 4173:4173 game-design-tools
```

打开：

```text
http://127.0.0.1:4173
```

## Compose

```bash
docker compose up --build
```

默认映射端口：

- 宿主机 `4173`
- 容器 `4173`

## 说明

- 容器会先执行 `npm run build`
- 然后用 `serve` 提供 `dist/` 静态文件
- 如果你要改成别的端口，只改 `docker-compose.yml` 和 `Dockerfile` 里的 `4173`
