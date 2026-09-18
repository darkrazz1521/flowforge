# FlowForge Architecture

FlowForge is a distributed workflow and job orchestration platform.

## Applications

- `apps/web` — React frontend
- `apps/api` — NestJS REST API
- `apps/worker` — asynchronous BullMQ worker

## Shared Packages

- `packages/shared` — shared types and constants
- `packages/config` — shared configuration
- `packages/eslint-config` — shared linting configuration

## Infrastructure

- PostgreSQL — persistent relational data
- Redis — queue and cache
- Nginx — reverse proxy
- Prometheus — metrics
- Grafana — monitoring

## Development Flow

Frontend → API → PostgreSQL / Redis → Worker

## Production Flow

Internet → Nginx → Web/API → PostgreSQL/Redis → Worker