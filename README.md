# PulseWatch

PulseWatch is a full-stack uptime monitoring app with an authenticated admin dashboard and a public status page. It lets an operator create URL monitors, run uptime checks, store response history, watch live latency updates, and publish service health for viewers.

Live app:

- Frontend: https://pulsewatch-dun.vercel.app
- Backend: https://pulsewatchpulsewatch-backend.onrender.com
- Repository: https://github.com/flamekaizerr/pulsewatch

## What It Does

PulseWatch monitors HTTP endpoints. Each monitor has a name, URL, interval, timeout, current status, alert setting, and ping history.

Core workflows:

- Admin signs in or uses the demo login.
- Admin creates monitor targets such as a backend health endpoint, GitHub, or Google.
- Admin can run one monitor check or run all due checks from the dashboard.
- A scheduled GitHub Actions cron calls the backend every 15 minutes.
- The backend checks due monitors, records response time and HTTP status, updates monitor health, prunes old logs, and broadcasts live changes over Socket.IO.
- The public status page shows current system health and recent uptime history.

Status rules:

- `UP`: HTTP status below 400.
- `DEGRADED`: HTTP status from 400 to 499.
- `DOWN`: HTTP status 500+, network failure, or timeout.
- `PENDING`: Monitor exists but has not been checked yet.

## Tech Stack

Frontend:

- React 18
- Vite
- TypeScript
- Tailwind CSS
- Recharts
- Socket.IO client
- Axios

Backend:

- Node.js
- Express
- TypeScript
- Socket.IO
- Prisma ORM
- JWT auth in HttpOnly cookies
- Zod validation

Data and infrastructure:

- PostgreSQL, currently intended for Supabase
- Prisma multi-schema support
- Optional Upstash Redis REST cache
- Optional Discord webhook alerts
- GitHub Actions scheduled checks
- Vercel frontend deployment
- Render backend deployment

Testing:

- Vitest
- Supertest
- Mocked Prisma integration tests

## Architecture

```text
Browser
  |
  | React/Vite frontend
  | - admin dashboard
  | - monitor detail charts
  | - public status page
  |
  v
Express API on Render
  |
  | routes under /api/*
  | HttpOnly JWT cookie auth
  | Socket.IO live updates
  |
  v
PostgreSQL via Prisma
  |
  | pulsewatch.User
  | pulsewatch.Monitor
  | pulsewatch.PingLog
  |
  v
Optional integrations
  |-- Upstash Redis cache for public status
  |-- Discord webhook alerts
  |-- GitHub Actions cron trigger
```

## Repository Structure

```text
pulsewatch/
  backend/
    prisma/
      schema.prisma
      seed.ts
      migrations/
    src/
      app.ts
      server.ts
      config/
      controllers/
      middlewares/
      routes/
      services/
    tests/
  frontend/
    src/
      pages/
      services/
      App.tsx
      main.tsx
  shared/
    types.ts
  .github/
    workflows/
      pulsewatch-cron.yml
```

## Important Product Decisions

This project changed shape while moving from local prototype to deployed product.

Key decisions:

- Use a monorepo so the React app, Express API, and shared TypeScript contracts live together.
- Use Prisma with the `pulsewatch` PostgreSQL schema instead of the default `public` schema. This keeps PulseWatch tables isolated from Supabase system tables and any unrelated project data.
- Use HttpOnly JWT cookies instead of localStorage for session handling.
- Use `SameSite=None` and secure cookies in production because Vercel and Render are different domains.
- Keep Redis optional. The backend uses Upstash Redis when configured and falls back to an in-memory cache when it is not.
- Keep Discord alerts optional. Missing webhook config should not block the app.
- Use GitHub Actions as the scheduler because it is simple, free-tier friendly, and does not require a separate worker process.
- Add a demo login so reviewers can enter the app without account setup.

Important pivots:

- The first frontend build had invalid JSX `class` attributes. These were converted to `className`.
- Backend TypeScript initially had root directory problems with shared types. The backend TypeScript config was adjusted so it can compile the shared contract folder.
- Local development failed because `.js` import suffixes did not work with the CommonJS `ts-node-dev` setup. Backend local imports were moved to extensionless TypeScript imports.
- Production login failed because the frontend used the Render backend root URL while calling `/auth/*`, but the backend serves auth under `/api/auth/*`. The frontend API client now normalizes backend root URLs to include `/api`.
- Production CORS failed because the backend originally allowed only `http://localhost:5173`. Express and Socket.IO now share an origin allowlist that includes the deployed Vercel frontend.
- The dashboard originally tried to run scheduled checks with a hardcoded cron secret. That is not safe or reliable in production. The dashboard now uses an authenticated admin route, `/api/monitors/check-all`, while GitHub Actions still uses the secured cron route.

## Environment Variables

### Backend

Create `backend/.env` from `backend/.env.example`.

Required:

```env
NODE_ENV=development
PORT=4000
JWT_SECRET=dev_jwt_secret_change_later
CRON_SECRET=dev_cron_secret_change_later
FRONTEND_URL=http://localhost:5173
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/pulsewatch?schema=pulsewatch
DIRECT_URL=postgresql://postgres:postgres@localhost:5432/pulsewatch?schema=pulsewatch
```

Optional:

```env
BACKEND_URL=http://localhost:4000
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
DISCORD_WEBHOOK_URL=
```

Notes:

- `DATABASE_URL` is used by Prisma Client.
- `DIRECT_URL` is used by Prisma migrations.
- If your database URL already has query params, append `&schema=pulsewatch`.
- If it has no query params, append `?schema=pulsewatch`.
- `FRONTEND_URL` must match the deployed frontend origin for credentialed CORS.
- `FRONTEND_URLS` can be used as a comma-separated extra allowlist if multiple frontend origins are needed.

### Frontend

Create `frontend/.env` from `frontend/.env.example`.

```env
VITE_API_URL=http://localhost:4000
VITE_SOCKET_URL=http://localhost:4000
```

In production:

```env
VITE_API_URL=https://pulsewatchpulsewatch-backend.onrender.com
VITE_SOCKET_URL=https://pulsewatchpulsewatch-backend.onrender.com
```

The frontend API client automatically adds `/api` when `VITE_API_URL` points at the backend root.

## Local Development

Install dependencies from the root and package folders as needed:

```bash
npm install
npm --prefix backend install
npm --prefix frontend install
```

Prepare the database:

```bash
npm --prefix backend run prisma:generate
npm --prefix backend run prisma:migrate
npm --prefix backend run prisma:seed
```

Run both apps:

```bash
npm run dev
```

Or run separately:

```bash
npm run dev:backend
npm run dev:frontend
```

Local URLs:

- Frontend: http://localhost:5173
- Backend health: http://localhost:4000/health

Demo account:

```text
Email: admin@pulsewatch.com
Password: demo1234
```

The demo login button also creates the demo user automatically if it does not exist.

## Scripts

Root scripts:

```bash
npm run dev
npm run build:backend
npm run build:frontend
npm run test:backend
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

Backend scripts:

```bash
npm --prefix backend run dev
npm --prefix backend run build
npm --prefix backend run start
npm --prefix backend run test
```

Frontend scripts:

```bash
npm --prefix frontend run dev
npm --prefix frontend run build
npm --prefix frontend run preview
```

## API Overview

Health:

- `GET /health`

Auth:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/auth/demo-login`

Monitors:

- `GET /api/monitors`
- `POST /api/monitors`
- `GET /api/monitors/:id`
- `PATCH /api/monitors/:id`
- `DELETE /api/monitors/:id`
- `POST /api/monitors/:id/check`
- `POST /api/monitors/check-all`

Public/status:

- `GET /api/status`
- `GET /api/dashboard/stats`
- `POST /api/internal/run-checks`

`/api/internal/run-checks` is for GitHub Actions or trusted cron callers only. It requires the `x-cron-secret` header.

## Deployment

### Supabase

Use a Supabase PostgreSQL database.

Prisma is configured with:

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["multiSchema"]
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
  schemas   = ["pulsewatch"]
}
```

All app tables use `@@schema("pulsewatch")`.

Production migration:

```bash
npm --prefix backend run prisma:generate
npm --prefix backend exec prisma migrate deploy
npm --prefix backend run prisma:seed
```

### Render Backend

Service type: Web Service

Root directory:

```text
backend
```

Build command:

```bash
npm install --include=dev && npx prisma generate && npm run build
```

Start command:

```bash
npm start
```

Required Render environment variables:

```env
NODE_ENV=production
DATABASE_URL=...
DIRECT_URL=...
JWT_SECRET=...
CRON_SECRET=...
FRONTEND_URL=https://pulsewatch-dun.vercel.app
```

Optional Render environment variables:

```env
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
DISCORD_WEBHOOK_URL=...
FRONTEND_URLS=https://pulsewatch-dun.vercel.app,http://localhost:5173
```

Render auto-deploys from the connected Git branch when auto-deploy is enabled.

### Vercel Frontend

Root directory:

```text
frontend
```

Build command:

```bash
npm run build
```

Output directory:

```text
dist
```

Environment variables:

```env
VITE_API_URL=https://pulsewatchpulsewatch-backend.onrender.com
VITE_SOCKET_URL=https://pulsewatchpulsewatch-backend.onrender.com
```

### GitHub Actions Cron

Workflow:

```text
.github/workflows/pulsewatch-cron.yml
```

Repository secrets:

```env
BACKEND_URL=https://pulsewatchpulsewatch-backend.onrender.com
CRON_SECRET=<same value as Render CRON_SECRET>
```

The workflow calls:

```text
POST /api/internal/run-checks
```

with:

```text
x-cron-secret: <CRON_SECRET>
```

## Troubleshooting

Login fails on deployed frontend:

- Confirm `VITE_API_URL` points to the backend root URL.
- Confirm the backend is deployed with the current code.
- Confirm Render `FRONTEND_URL` exactly matches the Vercel origin.
- Check that the backend preflight response includes `access-control-allow-origin: https://pulsewatch-dun.vercel.app`.

Dashboard redirects to login after clicking run checks:

- Confirm frontend is using `/api/monitors/check-all`.
- Do not call `/api/internal/run-checks` from the browser. That route requires `CRON_SECRET`.

Backend dev server cannot start:

- Use current extensionless backend imports.
- Run `npm --prefix backend run dev`.

Prisma migration touches wrong schema:

- Confirm every model has `@@schema("pulsewatch")`.
- Confirm `DATABASE_URL` and `DIRECT_URL` include `schema=pulsewatch`.

Public status page is stale:

- Redis cache may hold data briefly.
- Cache fallback is in-memory if Upstash variables are missing.
- Run monitor checks, then reload after cache expiry.

## Validation

Known-good validation commands:

```bash
npm run build:backend
npm run test:backend
npm run build:frontend
```

Known-good browser flows:

- Demo login reaches dashboard.
- Dashboard loads monitor stats.
- Run scheduled checks updates monitors.
- Monitor detail page shows logs and can run a single check.
- Public status page shows current operational state.

## Current Status

The app has been pushed to GitHub and is configured for automatic deploys through Vercel and Render. The latest production fixes address login, CORS, API base URL normalization, dashboard check execution, and local backend development startup.
