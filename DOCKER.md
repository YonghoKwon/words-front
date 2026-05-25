# Docker local run

This repo includes a local Docker Compose stack for the Words app.

## Services

- `words-front`: Vite build served by Nginx on `http://localhost:5173`
- `words-back`: Spring Boot API on `http://localhost:8080`
- Database: by default, the backend container connects to the existing MySQL exposed on the Mac host at `localhost:3306` via `host.docker.internal`.

## Run

```bash
docker compose up -d --build
```

## Stop

```bash
docker compose down
```

## Configuration

Override DB settings with environment variables if needed:

```bash
SPRING_DATASOURCE_URL='jdbc:mysql://host.docker.internal:3306/springboot?useUnicode=true&characterEncoding=utf8&connectionCollation=utf8mb4_unicode_ci&serverTimezone=Asia/Seoul' \
SPRING_DATASOURCE_USERNAME=root \
SPRING_DATASOURCE_PASSWORD=1234 \
docker compose up -d --build
```

Do not put frontend secrets in `.env` for Docker builds. `.env` files are intentionally excluded from the Docker build context so Vite does not bake local secrets into the browser bundle.
