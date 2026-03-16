# FindBid Backend

Node.js + Express API for the FindBid app. Implements all endpoints from the [API documentation](../FindBid/API_DOCUMENTATION.md).

## Setup

1. **Install dependencies**
   ```bash
   cd FindBid-Backend
   npm install
   ```

2. **Environment**
   - Copy `.env.example` to `.env` and fill in values (optional for local dev).
   - `PORT` – server port (default `3001`).
   - `CORS_ORIGIN` – allowed origins, comma-separated (e.g. `http://localhost:5173`).
   - `AUTH_SECRET` / `DATABASE_URL` – leave empty until you add auth/DB.

3. **Run**
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
| GET | `/conversations` | List conversations |
| POST | `/conversations` | Create/get conversation (`body: { participantId }`) |
| GET | `/conversations/:id/messages` | List messages |
| POST | `/conversations/:id/messages` | Send message (`body: { content, type? }`) |
| GET | `/activity` | Activity feed (`?limit=20`) |

## Data

- **In-memory store** with seed data is used by default so the API works without a database.
- When you add a real DB, set `DATABASE_URL` in `.env` and swap the store in `src/store.js` for your DB layer.

## Auth

- Optional: send `Authorization: Bearer <token>` for protected routes.
- If no token is sent, the server uses a default user (`user1`) so the app works without login.
