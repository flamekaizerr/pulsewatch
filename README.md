# PulseWatch

A full-stack uptime monitoring dashboard with live latency tracking, scheduled health checks, and a public status page.

- Frontend: https://pulsewatch-dun.vercel.app
- Backend: https://pulsewatchpulsewatch-backend.onrender.com
- Repository: https://github.com/flamekaizerr/pulsewatch

## Overview

PulseWatch lets an admin monitor HTTP endpoints and publish their current health. It stores response history, calculates uptime, streams live updates, and exposes a public status page for viewers.

Core features:

- Admin authentication with HttpOnly JWT cookies
- Demo login for quick review access
- Monitor CRUD for HTTP endpoints
- Manual single-check and all-due-check actions
- Scheduled uptime checks through GitHub Actions
- Live status and latency updates through Socket.IO
- Public status page with recent uptime history
- Optional Redis caching and Discord webhook alerts

## Tech Stack

Frontend:

- React 18
- Vite
- TypeScript
- Tailwind CSS
- Recharts
- Axios
- Socket.IO client

Backend:

- Node.js
- Express
- TypeScript
- Prisma
- PostgreSQL
- Socket.IO
- Zod
- JWT cookies

Infrastructure:

- Vercel for the frontend
- Render for the backend
- Supabase/PostgreSQL for data
- GitHub Actions for scheduled checks
- Optional Upstash Redis
- Optional Discord webhooks

## Architecture

```text
React/Vite frontend
  -> Express REST API on Render
  -> Prisma
  -> PostgreSQL pulsewatch schema

GitHub Actions cron
  -> POST /api/internal/run-checks
  -> uptime engine
  -> PingLog + Monitor status updates

Socket.IO
  -> live dashboard and monitor detail updates
```

## Project Structure

```text
pulsewatch/
  backend/      Express API, Socket.IO server, Prisma schema, tests
  frontend/     React/Vite client
  shared/       Shared TypeScript types
  .github/      Scheduled uptime check workflow
```

## Local Development

Install dependencies:

```bash
npm install
npm --prefix backend install
npm --prefix frontend install
```

Create environment files:

```bash
copy backend\.env.example backend\.env
copy frontend\.env.example frontend\.env
```

Prepare the database:

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

Run the app:

```bash
npm run dev
```

Local URLs:

- Frontend: http://localhost:5173
- Backend health: http://localhost:4000/health

Demo account:

```text
Email: admin@pulsewatch.com
Password: demo1234
```

## Environment Variables

Backend:

```env
NODE_ENV=production
PORT=4000
DATABASE_URL=...
DIRECT_URL=...
JWT_SECRET=...
CRON_SECRET=...
FRONTEND_URL=https://pulsewatch-dun.vercel.app
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
DISCORD_WEBHOOK_URL=
```

Frontend:

```env
VITE_API_URL=https://pulsewatchpulsewatch-backend.onrender.com
VITE_SOCKET_URL=https://pulsewatchpulsewatch-backend.onrender.com
```

Notes:

- Backend API routes are mounted under `/api`.
- The frontend API client accepts the backend root URL and normalizes it to `/api`.
- Production cookies require `SameSite=None` and `Secure` because Vercel and Render are separate origins.
- `FRONTEND_URL` must match the deployed frontend origin for credentialed CORS.

## Deployment

### Backend on Render

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

### Frontend on Vercel

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

### Scheduler

The workflow at `.github/workflows/pulsewatch-cron.yml` runs every 15 minutes and calls:

```text
POST /api/internal/run-checks
```

Required GitHub Actions secrets:

```env
BACKEND_URL=https://pulsewatchpulsewatch-backend.onrender.com
CRON_SECRET=<same value configured on Render>
```

## Scripts

```bash
npm run dev
npm run build:backend
npm run build:frontend
npm run test:backend
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

## Validation

Current known-good checks:

```bash
npm run build:backend
npm run test:backend
npm run build:frontend
```

Browser-verified flows:

- Demo login reaches the dashboard
- Dashboard monitor list loads
- Run scheduled checks updates monitor statuses
- Monitor detail page loads response logs
- Public status page loads current health

## Engineering Notes

PulseWatch intentionally keeps deployment simple: one frontend, one backend, one PostgreSQL database, and GitHub Actions for scheduling. Redis and Discord alerts are optional so the app still works on a minimal free-tier setup.

Detailed implementation history, deployment pivots, and troubleshooting notes are tracked in `PROGRESS.md`.
