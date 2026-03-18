# FindBid Backend

Node.js + Express API for the FindBid app. Implements all endpoints from the [API documentation](../FindBid/API_DOCUMENTATION.md).

## Setup

1. **Install dependencies** (Node 18+ required; use `nvm use` if you have nvm)
   ```bash
   cd FindBid-Backend
   nvm use          # or: nvm use 18
   npm install
   ```
   If install fails (e.g. ENOTEMPTY), try: `rm -rf node_modules package-lock.json && npm install`

2. **Environment**
   - Copy `.env.example` to `.env` and set:
     - **`DATABASE_URL`** – MySQL connection string (required). For **TiDB Cloud** (and any host that requires TLS), append `?sslaccept=strict` to the URL (e.g. `mysql://user:pass@host:4000/dbname?sslaccept=strict`). Local MySQL: `mysql://user:password@localhost:3306/findbid`
     - **`OPENAI_API_KEY`** – optional; for AI refine endpoint (`POST /v1/ai/refine`).
     - `PORT` – server port (default `3001`).
     - `CORS_ORIGIN` – allowed origins, comma-separated (e.g. `http://localhost:5173`).

3. **Database** (run these from the **FindBid-Backend** directory)
   - Create a MySQL database (e.g. `findbid`).
   - **Use Node 18+** (required for Prisma). If you see `WebAssembly.Module(): invalid value type 'externref'`, run `nvm use 18` (or install Node 18/20).
   - Push schema and seed:
   ```bash
   cd FindBid-Backend
   nvm use 18              # or nvm use 20 — required before Prisma commands
   npx prisma generate
   npx prisma db push      # applies schema to DB (adds/updates columns like phone)
   npm run db:seed
   ```
   - **Updating the DB after schema changes:** run `npx prisma generate` then `npx prisma db push` again. Use `npx prisma db push --force-reset` only if you want to drop all data and recreate tables (dev only).

4. **Run**
   ```bash
   npm run dev
   ```
   Or `npm start` for production.

## API base URL

- Local: `http://localhost:3001/v1`
- In the FindBid frontend, set `VITE_API_BASE_URL=http://localhost:3001/v1` in `.env` to use this backend.

## Endpoints (all under `/v1`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/requests` | List current user's requests (`?status=active\|completed\|cancelled`) |
| GET | `/requests/nearby` | Requests for map (`?lat=&lng=&radiusKm=&serviceType=`) |
| GET | `/requests/:id` | Get one request with bids |
| POST | `/requests` | Create request |
| PATCH | `/requests/:id` | Update request |
| POST | `/requests/:id/cancel` | Cancel request |
| GET | `/requests/:requestId/bids` | List bids for request |
| POST | `/requests/:requestId/bids` | Create bid (provider) |
| POST | `/bids/:id/accept` | Accept bid (user) |
| GET | `/providers` | List providers (`?serviceType=&search=&lat=&lng=&radiusKm=`) |
| GET | `/providers/:id` | Get one provider |
| POST | `/ai/refine` | AI refine request text (body: `{ text }`) |

## Data

- **MySQL + Prisma**. Set `DATABASE_URL` in `.env`, run `npx prisma db push` and `npm run db:seed`.
- Schema: `Provider`, `Request`, `Bid` (see `prisma/schema.prisma`).

## Auth

- Optional: send `Authorization: Bearer <token>` for protected routes.
- If no token is sent, the server uses a default user (`user1`) so the app works without login.
