# PulseWatch: Real-Time Uptime Monitor & Public Status Page

PulseWatch is a developer-centric, full-stack uptime monitoring and incident alerting service with a public status page. It is structured as a TypeScript monorepo and designed to be deployed entirely on cloud free tiers.

---

## ⚡ Tech Stack & Architecture

- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, Recharts (for live latency graphs), Socket.io-client.
- **Backend:** Node.js, Express, TypeScript, Socket.io, Prisma ORM.
- **Database:** PostgreSQL (with database schema isolation to avoid modifying other tables).
- **Caching:** Redis / Upstash Redis REST (completely optional, falls back to in-memory).
- **Scheduler:** GitHub Actions Cron triggers a secured endpoint every 15 minutes.
- **Alerts:** Discord Channel Webhooks (optional, falls back to console logs).

---

## 📂 Project Structure

```
pulsewatch/
├── backend/                  # Express REST API + Socket.io Server
│   ├── prisma/               # Schema and Database Seeding
│   ├── src/                  # Controllers, Routes, Services, Middlewares
│   └── tests/                # Vitest + Supertest integration tests
├── frontend/                 # React client
│   └── src/                  # Pages, Components, and services
└── shared/                   # Common TypeScript interfaces
```

---

## 🚀 Phase 1: Local Development & Setup

You can run PulseWatch locally without any cloud services.

### 1. Prerequisites
- Node.js (v18+)
- Local PostgreSQL instance (or live Dev Database URL)

### 2. Database Preparation
Create a PostgreSQL database named `pulsewatch` locally. The Prisma client is configured to isolate all tables inside a custom schema named `pulsewatch` so that it never touches the `public` schema.

### 3. Backend Setup
1. Enter the `backend/` directory:
   ```bash
   cd backend
   ```
2. Copy the environment variables:
   ```bash
   copy .env.example .env
   ```
3. Update `.env` with your database credentials. (If you want to test Upstash Redis or Discord webhooks locally, paste their credentials there; otherwise, leave them empty to run in mock/no-cache mode).
4. Run database migrations:
   ```bash
   npx prisma migrate dev
   ```
5. Seed the database with the mock admin and monitors:
   ```bash
   npx prisma db seed
   ```
6. Start the development server:
   ```bash
   npm run dev
   ```
   The backend will start on: **http://localhost:4000**

### 4. Frontend Setup
1. Enter the `frontend/` directory:
   ```bash
   cd ../frontend
   ```
2. Copy the environment variables:
   ```bash
   copy .env.example .env
   ```
3. Install dependencies and start the Vite dev server:
   ```bash
   npm install
   npm run dev
   ```
   The frontend will run on: **http://localhost:5173**

### 5. Running Tests
You can run the backend test suite (which includes endpoint integration tests using mocked databases):
```bash
cd backend
npm run test
```

---

## ☁️ Phase 2: Cloud Deployment Guide

Once local validation is complete, follow these guidelines to deploy for free.

### 1. Database (Supabase Free)
You can reuse an existing Supabase project. PulseWatch tables are strictly isolated under the `pulsewatch` schema.
1. Copy the Database Connection String from your Supabase Dashboard (Settings -> Database).
2. Append `?schema=pulsewatch` to the end of the `DATABASE_URL` and `DIRECT_URL` connection strings to force schema isolation.
3. Apply migrations to your production database from your local machine:
   ```bash
   cd backend
   npx prisma migrate deploy
   ```

### 2. Backend (Render Free Web Service)
1. Import your GitHub repository into Render.
2. Select **Web Service** and choose Node environment.
3. Root Directory: `backend`
4. Build Command: `npm install && npm run build && npx prisma generate`
5. Start Command: `npm start`
6. Set the Environment Variables:
   - `NODE_ENV` = `production`
   - `DATABASE_URL` = (your Supabase Postgres URL with `?schema=pulsewatch`)
   - `JWT_SECRET` = (a long secure random string)
   - `CRON_SECRET` = (a secure random string to validate incoming checks)
   - `FRONTEND_URL` = (your deployed Vercel frontend URL)
   - `DISCORD_WEBHOOK_URL` = (optional, for Discord alert notifications)
   - `UPSTASH_REDIS_REST_URL` = (optional, for Redis cache)
   - `UPSTASH_REDIS_REST_TOKEN` = (optional, for Redis cache)

### 3. Frontend (Vercel)
1. Import your GitHub repository to Vercel.
2. Select the `frontend` folder as the Root Directory.
3. Configure the Build Settings:
   - Framework Preset: **Vite**
   - Output Directory: `dist`
4. Set Environment Variables:
   - `VITE_API_URL` = (your Render backend URL, e.g. `https://pulsewatch-api.onrender.com`)
   - `VITE_SOCKET_URL` = (your Render backend URL, e.g. `https://pulsewatch-api.onrender.com`)

### 4. Scheduler (GitHub Actions Cron)
1. Go to your GitHub Repository -> Settings -> Secrets and variables -> Actions.
2. Create two repository secrets:
   - `BACKEND_URL` = (your Render backend URL, e.g., `https://pulsewatch-api.onrender.com`)
   - `CRON_SECRET` = (the same `CRON_SECRET` string you configured in Render)
3. The workflow in `.github/workflows/pulsewatch-cron.yml` will automatically call the `/api/internal/run-checks` route every 15 minutes.
