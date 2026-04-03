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
- [Database Schemas](#database-schemas)
- [API Reference](#api-reference)
- [Socket.io Events](#socketio-events)
- [Frontend Pages & Components](#frontend-pages--components)
- [Key Implementation Details](#key-implementation-details)

---

## Overview

EchoVote lets venues hand over the playlist to their crowd. The admin registers a venue, displays the QR code (on a TV, tablet, or printed), and guests vote in real time from their phones — no app install required.

**Flow:**
1. Admin registers → gets a venue ID + QR code
2. Guests scan QR → land on `/venue/:id`
3. Guests search YouTube, add songs, and vote
4. Server deduplicates votes via browser fingerprint
5. All connected clients update live via Socket.io
6. Admin dashboard controls playback, skip, and filters

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
| Auth | JWT (jsonwebtoken + bcryptjs) |
| Song Search | YouTube Data API v3 |
| Playback | YouTube IFrame Player API |
| Fingerprinting | @fingerprintjs/fingerprintjs |
| QR Codes | qrcode (npm) |
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
│       │   ├── AdminLogin.jsx       # Admin login + registration
│       │   └── AdminDashboard.jsx   # Admin control panel
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
    └── src/
        ├── index.js                 # App entry: Express + Socket.io + DB
        ├── config/
        │   ├── db.js                # Mongoose connection
        │   └── env.js               # Centralised env vars
        ├── models/
        │   ├── Venue.js
        │   ├── Song.js
        │   ├── ActiveQueue.js
        │   ├── PlaybackState.js
        │   └── Admin.js
        ├── routes/
        │   ├── auth.js              # POST /api/auth/login|register
        │   ├── songs.js             # GET|POST /api/songs/:venueId, GET search
        │   ├── votes.js             # POST /api/votes/:songId
        │   ├── admin.js             # POST /api/admin/* (JWT protected)
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

Go to `http://localhost:5173/admin/login`, switch to **Register**, and create an account with a venue name. This creates the venue in MongoDB and returns a JWT.

### 4. Share the QR code

The admin dashboard (`/admin/dashboard`) displays a QR code. Guests scan it to land on `/venue/:id` and start voting.

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
- Hot-reloads via `nodemon` in development

### `client`
- Built from `./client/Dockerfile`
- Port: `5173`
- Vite dev server with `--host` for Docker networking
- Depends on `server`

---

## Database Schemas

### Venue
```js
{
  name: String,
  qrCodeSecret: String,       // unique slug used in QR URL
  settings: {
    explicitFilter: Boolean,  // filter explicit content
    weeklySeeds: [String],    // YouTube video IDs for seed playlist
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
  voterFingerprints: [String],  // dedup list per song
  venueId: ObjectId → Venue
}
```

### PlaybackState
```js
{
  venueId: ObjectId → Venue,   // unique per venue
  currentSongId: ObjectId → Song,
  progress: Number,
  isPlaying: Boolean
}
```

### Admin
```js
{
  email: String,
  passwordHash: String,        // bcrypt, 12 rounds
  venueId: ObjectId → Venue
}
```

---

## API Reference

### Auth

| Method | Endpoint | Body | Description |
|---|---|---|---|
| POST | `/api/auth/register` | `{ email, password, venueName }` | Create admin + venue, returns JWT |
| POST | `/api/auth/login` | `{ email, password }` | Returns JWT + venueId |

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

### Admin _(all require `Authorization: Bearer <token>`)_

| Method | Endpoint | Body | Description |
|---|---|---|---|
| POST | `/api/admin/skip` | — | Remove current song, advance to next highest voted |
| POST | `/api/admin/pause` | — | Toggle `isPlaying` on PlaybackState |
| POST | `/api/admin/filter` | — | Toggle `explicitFilter` on venue settings |
| POST | `/api/admin/seed` | `{ seeds: [String] }` | Set weekly seed YouTube video IDs |

### QR

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/qr/:venueId` | Returns a 300×300 PNG QR code pointing to `/venue/:venueId` |

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
Guest-facing page. Loads fingerprint on mount, fetches the queue, listens for real-time updates. Supports searching YouTube and adding songs. Vote state is tracked locally per session.

**`/admin/login` — AdminLogin**
Login and registration form. On success, stores JWT + venueId in `localStorage` and redirects to the dashboard.

**`/admin/dashboard` — AdminDashboard**
Admin control panel. Embeds the YouTube IFrame Player (auto-plays, triggers skip on song end). Shows live queue, QR code, and controls for skip, pause, explicit filter, and seed playlist.

### Components

| Component | Description |
|---|---|
| `SongCard` | Displays rank, thumbnail, title, artist, and vote button |
| `VoteButton` | Upvote button; shows voted state, disables after vote |
| `SearchBar` | YouTube search input; shows results inline with Add button |
| `Leaderboard` | Renders the sorted queue as a list of `SongCard`s |
| `NowPlaying` | Fixed bottom bar with animated bars showing the current track |
| `QRDisplay` | Renders the QR PNG from `/api/qr/:venueId` |

### Hooks

**`useSocket(venueId, handlers)`**
Connects to Socket.io, joins the venue room, and binds/unbinds event handlers automatically on mount/unmount.

**`useVenue(venueId)`**
Fetches the initial queue via REST, then keeps it in sync via `queue_updated`, `update_tally`, and `now_playing` socket events. Returns `{ queue, nowPlaying, loading, refetch }`.

---

## Key Implementation Details

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
