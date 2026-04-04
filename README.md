# EchoVote

A real-time, QR-code-based song voting system for public venues. Guests scan a QR code, search YouTube for songs, and vote — the crowd decides what plays next.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Docker Services](#docker-services)
- [Two-Factor Authentication](#two-factor-authentication)
- [Venue Image](#venue-image)
- [Database Schemas](#database-schemas)
- [API Reference](#api-reference)
- [Socket.io Events](#socketio-events)
- [Frontend Pages & Components](#frontend-pages--components)
- [Key Implementation Details](#key-implementation-details)
- [Deployment Guide (Free Hosting)](#deployment-guide-free-hosting)

---

## Overview

EchoVote lets venues hand over the playlist to their crowd. The admin registers a venue, displays the QR code (on a TV, tablet, or printed), and guests vote in real time from their phones — no app install required.

**Flow:**
1. Admin registers → sets up 2FA with authenticator app → gets a venue ID + QR code
2. Admin uploads a venue photo from the dashboard
3. Guests scan QR → land on `/venue/:id` (shows venue name and photo)
4. Guests search YouTube, add songs, and vote
5. Server deduplicates votes via browser fingerprint
6. All connected clients update live via Socket.io
7. Admin dashboard controls playback, skip, and filters

---

## Architecture

Monorepo with three top-level directories:

```
echovote/
├── client/          # React frontend (Vite)
├── server/          # Node.js backend (Express + Socket.io)
└── docker-compose.yml
```

The three Docker services (client, server, mongo) communicate over an internal bridge network. MongoDB data is persisted via a named volume.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, React Router v6 |
| Realtime | Socket.io (client + server) |
| Backend | Node.js, Express |
| Database | MongoDB 7 via Mongoose ODM |
| Auth | JWT + bcrypt + TOTP 2FA (speakeasy) |
| Song Search | YouTube Data API v3 |
| Playback | YouTube IFrame Player API |
| Fingerprinting | @fingerprintjs/fingerprintjs |
| QR Codes | qrcode (npm) |
| File Uploads | multer |
| Rate Limiting | express-rate-limit |
| Containerization | Docker + Docker Compose |

---

## Project Structure

```
echovote/
├── docker-compose.yml
├── .env.example
├── client/
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── index.css
│       ├── pages/
│       │   ├── VenuePage.jsx        # Guest voting UI (/venue/:id)
│       │   ├── AdminLogin.jsx       # Admin login + registration + 2FA setup
│       │   └── AdminDashboard.jsx   # Admin control panel + venue image
│       ├── components/
│       │   ├── SongCard.jsx         # Single queue entry with vote button
│       │   ├── VoteButton.jsx       # Upvote button with voted state
│       │   ├── SearchBar.jsx        # YouTube search + add to queue
│       │   ├── Leaderboard.jsx      # Ranked queue list
│       │   ├── NowPlaying.jsx       # Fixed bottom bar showing current song
│       │   └── QRDisplay.jsx        # QR code image from API
│       ├── hooks/
│       │   ├── useSocket.js         # Socket.io connection + event binding
│       │   └── useVenue.js          # Queue state + real-time sync
│       └── services/
│           ├── api.js               # Axios instance + all API calls
│           └── socket.js            # Socket.io singleton
└── server/
    ├── Dockerfile
    ├── package.json
    ├── uploads/                     # Venue images (served statically)
    └── src/
        ├── index.js                 # App entry: Express + Socket.io + DB
        ├── config/
        │   ├── db.js                # Mongoose connection
        │   └── env.js               # Centralised env vars
        ├── models/
        │   ├── Venue.js             # + image field
        │   ├── Song.js
        │   ├── ActiveQueue.js
        │   ├── PlaybackState.js
        │   └── Admin.js             # + twoFactorSecret, twoFactorEnabled
        ├── routes/
        │   ├── auth.js              # Login, register, 2FA setup + verify
        │   ├── songs.js             # GET|POST /api/songs/:venueId, GET search
        │   ├── votes.js             # POST /api/votes/:songId
        │   ├── admin.js             # Admin controls + venue image upload
        │   └── qr.js                # GET /api/qr/:venueId
        ├── middleware/
        │   ├── auth.js              # JWT Bearer token verification
        │   └── rateLimiter.js       # 10 votes/min per IP
        ├── services/
        │   ├── youtubeService.js    # YouTube Data API v3 search
        │   ├── socketManager.js     # Global io singleton + emitToVenue helper
        │   └── voteController.js    # Fingerprint dedup + vote broadcast
        └── socket/
            └── handlers.js          # join_venue + cast_vote socket events
```

---

## Getting Started

### Prerequisites

- [Docker](https://www.docker.com/) and Docker Compose
- A [YouTube Data API v3](https://console.cloud.google.com/) key

### 1. Clone and configure

```bash
git clone https://github.com/Chenarrr/Echovote-Project-.git
cd Echovote-Project-
cp .env.example .env
```

Edit `.env` and fill in your values:

```
JWT_SECRET=some_long_random_string
YOUTUBE_API_KEY=your_api_key_here
```

Generate a secure JWT_SECRET:
```bash
openssl rand -hex 32
```

### 2. Start all services

```bash
docker compose up --build
```

| Service | URL |
|---|---|
| Client (React) | http://localhost:5173 |
| Server (API) | http://localhost:3001 |
| MongoDB | localhost:27017 |

### 3. Register an admin account

1. Go to `http://localhost:5173/admin/login`
2. Switch to **Register** and fill in venue name, email, password
3. Scan the 2FA QR code with your authenticator app (Google Authenticator, Authy, etc.)
4. Enter the 6-digit code to complete setup

### 4. Set up your venue

From the admin dashboard:
- Upload a venue photo (shown to guests on the voting page)
- Display the QR code on a screen, projector, or print it

### 5. Share with guests

Guests scan the QR code from their phone and land on the voting page — no app install needed.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `JWT_SECRET` | Yes | Secret key for signing JWTs |
| `YOUTUBE_API_KEY` | Yes | YouTube Data API v3 key |
| `PORT` | No | Server port (default: `3001`) |
| `MONGO_URI` | No | MongoDB connection string (default: `mongodb://mongo:27017/echovote`) |
| `CLIENT_ORIGIN` | No | CORS allowed origin (default: `http://localhost:5173`) |
| `NODE_ENV` | No | `development` or `production` |

Client-side (set in docker-compose or `.env`):

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend base URL (default: `http://localhost:3001`) |
| `VITE_SOCKET_URL` | Socket.io server URL (default: `http://localhost:3001`) |

---

## Docker Services

Defined in `docker-compose.yml`:

### `mongo`
- Image: `mongo:7`
- Port: `27017`
- Volume: `mongo_data` (persistent)

### `server`
- Built from `./server/Dockerfile`
- Port: `3001`
- Depends on `mongo`
- Serves uploaded images from `/uploads` statically

### `client`
- Built from `./client/Dockerfile`
- Port: `5173`
- Vite dev server with `--host` for Docker networking
- Depends on `server`

---

## Two-Factor Authentication

EchoVote uses TOTP (Time-based One-Time Password) for admin security.

**Setup flow (on registration):**
1. Server generates a TOTP secret using `speakeasy`
2. Client displays a QR code for the authenticator app
3. Admin scans the QR and enters the 6-digit code to verify
4. Once verified, 2FA is permanently enabled for that account

**Login flow:**
1. Admin enters email + password
2. If 2FA is enabled, server responds with `{ requires2FA: true }`
3. Client shows the TOTP input screen
4. Admin enters the 6-digit code from their authenticator
5. Server verifies and issues a JWT

Supported apps: Google Authenticator, Authy, 1Password, Microsoft Authenticator, or any TOTP-compatible app.

---

## Venue Image

Admins can upload a venue photo (JPG/PNG, max 5MB) from the dashboard.

- Stored on disk in `server/uploads/`
- Served statically at `/uploads/<filename>`
- Displayed in the dashboard header and on the guest voting page
- Helps guests confirm they're voting for the right venue

---

## Database Schemas

### Venue
```js
{
  name: String,
  qrCodeSecret: String,
  image: String,              // path to uploaded venue photo
  settings: {
    explicitFilter: Boolean,
    weeklySeeds: [String],
  }
}
```

### Song
```js
{
  youtubeId: String,
  title: String,
  thumbnail: String,
  artist: String,
  voteCount: Number,
  addedBy: String,
  isExplicit: Boolean,
  venueId: ObjectId → Venue
}
```

### ActiveQueue
```js
{
  songId: ObjectId → Song,
  voteCount: Number,
  timestamp: Date,
  voterFingerprints: [String],
  venueId: ObjectId → Venue
}
```

### PlaybackState
```js
{
  venueId: ObjectId → Venue,
  currentSongId: ObjectId → Song,
  progress: Number,
  isPlaying: Boolean
}
```

### Admin
```js
{
  email: String,
  passwordHash: String,
  venueId: ObjectId → Venue,
  twoFactorSecret: String,    // TOTP base32 secret
  twoFactorEnabled: Boolean    // true after initial setup verified
}
```

---

## API Reference

### Auth

| Method | Endpoint | Body | Description |
|---|---|---|---|
| POST | `/api/auth/register` | `{ email, password, venueName }` | Create admin + venue, returns 2FA setup QR |
| POST | `/api/auth/verify-2fa-setup` | `{ email, token }` | Verify TOTP code and enable 2FA, returns JWT |
| POST | `/api/auth/login` | `{ email, password, totpCode? }` | Login; returns `{ requires2FA: true }` if 2FA enabled and no code provided |

### Songs

| Method | Endpoint | Params / Body | Description |
|---|---|---|---|
| GET | `/api/songs/search` | `?q=<query>` | Search YouTube Data API v3 |
| GET | `/api/songs/:venueId` | — | Get active queue sorted by votes desc |
| POST | `/api/songs/:venueId` | `{ youtubeId, title, thumbnail, artist, addedBy }` | Add song to queue |

### Votes

| Method | Endpoint | Body | Description |
|---|---|---|---|
| POST | `/api/votes/:songId` | `{ visitorFingerprint }` | Cast a vote; rate-limited to 10/min per IP |

Returns `409` if fingerprint already voted for that song.

### Venue (public)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/venue/:venueId` | Returns venue name and image (no auth required) |

### Admin _(all require `Authorization: Bearer <token>`)_

| Method | Endpoint | Body | Description |
|---|---|---|---|
| POST | `/api/admin/skip` | — | Remove current song, advance to next highest voted |
| POST | `/api/admin/pause` | — | Toggle `isPlaying` on PlaybackState |
| POST | `/api/admin/filter` | — | Toggle `explicitFilter` on venue settings |
| POST | `/api/admin/seed` | `{ seeds: [String] }` | Set weekly seed YouTube video IDs |
| POST | `/api/admin/venue-image` | `multipart/form-data` with `image` field | Upload venue photo (JPG/PNG, max 5MB) |
| GET | `/api/admin/venue` | — | Get full venue details for authenticated admin |

### QR

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/qr/:venueId` | Returns a 300x300 PNG QR code pointing to `/venue/:venueId` |

### Health

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Returns `{ status: "ok" }` |

---

## Socket.io Events

All events are scoped to a venue room (`venue:<venueId>`). Clients join by emitting `join_venue`.

### Client → Server

| Event | Payload | Description |
|---|---|---|
| `join_venue` | `{ venueId }` | Join the venue's Socket.io room |
| `cast_vote` | `{ songId, fingerprint, venueId }` | Vote via socket (alternative to REST) |

### Server → All clients in venue room

| Event | Payload | Description |
|---|---|---|
| `update_tally` | `{ songId, newCount }` | A single song's vote count changed |
| `queue_updated` | `{ queue }` | Full sorted queue (after add or vote) |
| `now_playing` | `{ song }` | Current song changed (skip or auto-advance) |
| `playback_state` | `{ isPlaying }` | Pause/resume toggled by admin |
| `vote_error` | `{ error }` | Emitted back to voter socket on failure |

---

## Frontend Pages & Components

### Pages

**`/venue/:id` — VenuePage**
Guest-facing page. Shows venue name and photo in the header. Loads fingerprint on mount, fetches the queue, listens for real-time updates. Supports searching YouTube and adding songs.

**`/admin/login` — AdminLogin**
Three-step flow: credentials → 2FA setup (on register) or 2FA verification (on login) → dashboard redirect.

**`/admin/dashboard` — AdminDashboard**
Admin control panel with:
- Venue photo upload section
- YouTube IFrame Player (auto-plays, triggers skip on song end)
- Live queue with real-time vote counts
- QR code display
- Controls for skip, pause, explicit filter, seed playlist

### Components

| Component | Description |
|---|---|
| `SongCard` | Displays rank, thumbnail, title, artist, and vote button |
| `VoteButton` | Upvote button; shows voted state, disables after vote |
| `SearchBar` | YouTube search with search icon; shows results inline with Add button |
| `Leaderboard` | Ranked queue list with song count |
| `NowPlaying` | Fixed bottom bar with animated equalizer bars |
| `QRDisplay` | QR code with venue link |

### Hooks

**`useSocket(venueId, handlers)`**
Connects to Socket.io, joins the venue room, and binds/unbinds event handlers automatically on mount/unmount.

**`useVenue(venueId)`**
Fetches the initial queue via REST, then keeps it in sync via `queue_updated`, `update_tally`, and `now_playing` socket events. Returns `{ queue, nowPlaying, loading, refetch }`.

---

## Key Implementation Details

**Two-factor authentication**
Admin accounts are protected with TOTP 2FA. The secret is generated during registration using `speakeasy`, and the admin verifies it with their authenticator app before the account is fully activated. Login requires both password and TOTP code.

**Venue branding**
Each venue can upload a photo that is displayed on both the admin dashboard and the guest voting page, making the experience feel tailored to the specific location.

**Duplicate vote prevention**
Each `ActiveQueue` document stores a `voterFingerprints` array. Before incrementing, `voteController.js` checks if the fingerprint is already in the array. Fingerprints are generated client-side with `@fingerprintjs/fingerprintjs`.

**Real-time updates**
All clients join a Socket.io room keyed by venue ID. Every vote, song add, or skip broadcasts to the entire room so every open browser tab updates instantly.

**Auto-advance playback**
The YouTube IFrame Player's `onStateChange` fires when a video ends (`YT.PlayerState.ENDED`). The admin dashboard calls `POST /api/admin/skip` automatically, which removes the current song from the queue, picks the next highest-voted, and broadcasts `now_playing` to all clients.

**JWT flow**
- Stored in `localStorage` as `echovote_token`
- Axios interceptor in `api.js` attaches it as `Authorization: Bearer <token>` on every request
- Server middleware in `auth.js` verifies and decodes it, attaching `req.admin` with `{ adminId, venueId }`

**Rate limiting**
`express-rate-limit` on `POST /api/votes/:songId` — max 10 requests per minute per IP.

---

## Deployment Guide (Free Hosting)

You can deploy EchoVote for free using these services:

### Option 1: Render (Server) + Vercel (Client) + MongoDB Atlas (DB)

This is the recommended free stack.

#### Step 1: MongoDB Atlas (free 512MB cluster)

1. Go to [mongodb.com/atlas](https://www.mongodb.com/atlas) and create a free account
2. Create a free shared cluster (M0)
3. Create a database user with a password
4. Whitelist `0.0.0.0/0` for IP access (or specific IPs)
5. Copy the connection string: `mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/echovote`

#### Step 2: Deploy the server on Render

1. Go to [render.com](https://render.com) and sign in with GitHub
2. Click **New** → **Web Service**
3. Connect your GitHub repo
4. Configure:
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `node src/index.js`
   - **Instance Type**: Free
5. Add environment variables:
   - `MONGO_URI` = your Atlas connection string
   - `JWT_SECRET` = your secret
   - `YOUTUBE_API_KEY` = your API key
   - `CLIENT_ORIGIN` = your Vercel URL (set after deploying client)
   - `NODE_ENV` = `production`
6. Deploy — note the Render URL (e.g. `https://echovote-server.onrender.com`)

#### Step 3: Deploy the client on Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click **Add New** → **Project**
3. Import your GitHub repo
4. Configure:
   - **Root Directory**: `client`
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Add environment variables:
   - `VITE_API_URL` = your Render server URL
   - `VITE_SOCKET_URL` = your Render server URL
6. Deploy — note the Vercel URL (e.g. `https://echovote.vercel.app`)
7. Go back to Render and update `CLIENT_ORIGIN` to your Vercel URL

#### Step 4: Update CORS

Once both are deployed, make sure `CLIENT_ORIGIN` on Render matches your Vercel domain exactly.

### Option 2: Fly.io (full stack)

1. Install the Fly CLI: `curl -L https://fly.io/install.sh | sh`
2. Create a Fly account and run `fly auth login`
3. Deploy the server:
   ```bash
   cd server
   fly launch --name echovote-server
   fly secrets set JWT_SECRET=... YOUTUBE_API_KEY=... MONGO_URI=... CLIENT_ORIGIN=...
   fly deploy
   ```
4. Deploy the client similarly, or host it on Vercel/Netlify

### Cost comparison

| Service | Free tier | Notes |
|---|---|---|
| **MongoDB Atlas** | 512MB M0 cluster | More than enough for most venues |
| **Render** | 750 hours/month | Spins down after 15min inactivity, ~30s cold start |
| **Vercel** | Unlimited static deploys | Perfect for the React client |
| **Fly.io** | 3 shared VMs, 160GB bandwidth | Always-on, no cold start |

For a venue app that needs to stay responsive during events, consider Fly.io (server) + Vercel (client) + Atlas (DB). For hobby/testing, Render + Vercel + Atlas is completely free.

### Sharing with friends

Once deployed, just share the Vercel URL. They can register their own venue and start using it immediately. The QR code will automatically point to the correct production URL.
