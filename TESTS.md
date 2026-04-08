# EchoVote — Test Results

**Run date:** 2026-04-08  
**Framework:** Jest 30 + Supertest + socket.io-client + mongodb-memory-server  
**Command:** `npm test` (`jest --runInBand`)  
**Overall Result: 47 / 47 PASSED — 0 FAILED**

---

## Summary

| Category              | Tests | Passed | Failed |
|-----------------------|-------|--------|--------|
| Unit Tests            | 24    | 24     | 0      |
| API Integration Tests | 18    | 18     | 0      |
| WebSocket Tests       | 5     | 5      | 0      |
| **Total**             | **47**| **47** | **0**  |

Total suite runtime: ~7s

---

# 1. Unit Tests (24/24 PASSED)

### `__tests__/unit/voteController.test.js`

Tests the `castVote` and `undoVote` functions from `src/services/voteController.js`.  
Uses `mongodb-memory-server` for an in-memory DB. `socketManager` is fully mocked.

| ID    | Test | Status | Duration |
|-------|------|--------|----------|
| UT-01 | castVote increments voteCount and stores fingerprint | PASS | 112ms |
| UT-02 | castVote rejects duplicate fingerprint | PASS | 6ms |
| UT-03 | castVote throws for non-existent songId | PASS | 2ms |
| UT-13 | undoVote decrements voteCount from 1 to 0 | PASS | 5ms |
| UT-14 | undoVote removes fingerprint from voterFingerprints | PASS | 5ms |
| UT-15 | undoVote without prior vote throws error | PASS | 2ms |

**Notes:**
- `undoVote` was extracted from the inline DELETE route handler into `voteController.js` to make it unit-testable. The route was updated to call `undoVote`.
- `emitToVenue` is mocked — socket emission is not tested here.

---

### `__tests__/unit/authMiddleware.test.js`

Tests `src/middleware/auth.js` via a minimal Express app + Supertest. No DB required.  
JWT secret uses the default fallback `'fallback_dev_secret'` (matches `src/config/env.js`).

| ID    | Test | Status | Duration |
|-------|------|--------|----------|
| UT-04 | Valid JWT passes middleware and sets req.admin | PASS | 1ms |
| UT-05 | Missing Bearer token returns 401 | PASS | 1ms |
| UT-06 | Expired JWT returns 401 | PASS | 1ms |

**Notes:**
- UT-06 uses a token with `exp` set 1 hour in the past to simulate expiry without `setTimeout`.
- UT-04 verifies `res.body.admin` contains both `adminId` and `venueId`.

---

### `__tests__/unit/rateLimiter.test.js`

Tests rate limiting behaviour via fresh Express app instances with new `rateLimit` instances per test.  
Fresh instances ensure each test starts with zero request count.

| ID    | Test | Status | Duration |
|-------|------|--------|----------|
| UT-07 | voteLimiter: allows first 10 requests (200) | PASS | 7ms |
| UT-08 | voteLimiter: blocks 11th request (429) | PASS | 4ms |
| UT-22 | authLimiter: allows first 20 requests (200) | PASS | 8ms |
| UT-23 | authLimiter: blocks 21st request (429) | PASS | 6ms |

**Notes:**
- Each test calls `beforeEach` which creates a fresh `express()` + fresh `rateLimit()` instance, giving a clean MemoryStore.
- `voteLimiter`: windowMs=60s, max=10. `authLimiter`: windowMs=15min, max=20. Configs match production exactly.

---

### `__tests__/unit/youtubeService.test.js`

Tests `src/services/youtubeService.js`. `axios` is fully mocked — no real HTTP calls.

| ID    | Test | Status | Duration |
|-------|------|--------|----------|
| UT-09 | searchYouTube returns mapped results with expected shape | PASS | 1ms |

**Notes:**
- Verifies HTML entity decoding (`&amp;` → `&`, `&#39;` → `'`).
- Verifies `isExplicit: true` when `ytRating === 'ytAgeRestricted'`.
- Mock covers both `/search` and `/videos` endpoints.

---

### `__tests__/unit/models.test.js`

Tests Mongoose model schemas, defaults, validation, and hooks.  
Uses `mongodb-memory-server`. All tests run against real Mongoose operations.

| ID    | Test | Status | Duration |
|-------|------|--------|----------|
| UT-10 | Song: missing youtubeId fails with ValidationError | PASS | 6ms |
| UT-11 | Admin: duplicate email fails with code 11000 | PASS | 151ms |
| UT-12 | ActiveQueue: voterFingerprints defaults to [] | PASS | 5ms |
| UT-16 | Song: isExplicit defaults to false | PASS | 2ms |
| UT-17 | Song: addedBy stores the fingerprint string | PASS | 4ms |
| UT-18 | Venue: explicitFilter defaults to false | PASS | 2ms |
| UT-19 | Venue: pre-delete hook removes linked admin | PASS | 11ms |
| UT-20 | PlaybackState: isPlaying defaults to false | PASS | 3ms |
| UT-21 | PlaybackState: currentSongId defaults to null | PASS | 2ms |
| UT-24 | ActiveQueue: voteCount defaults to 0 | PASS | 2ms |

**Notes:**
- UT-11 (~150ms) is slower due to Mongoose ensuring the unique index is built before the second insert.
- UT-19 uses `Venue.findOneAndDelete()` which is the only method that triggers the `pre('findOneAndDelete')` hook defined in `Venue.js`. Using `deleteOne` or `remove` would NOT trigger the hook.

---

# 2. API Integration Tests (18/18 PASSED)

All integration tests mount the real Express routes against a real in-memory MongoDB. `socketManager` and `rateLimiter` are mocked (no-op) in these files to isolate HTTP behaviour — socket emission is tested separately in the WebSocket section.

### `__tests__/integration/auth.test.js`

| ID    | Endpoint | Test | Status | Duration |
|-------|----------|------|--------|----------|
| IT-01 | POST /api/auth/register | Valid data returns 201 with qrCode+secret+setupRequired | PASS | 529ms |
| IT-02 | POST /api/auth/register | Duplicate email returns 409 | PASS | 352ms |
| IT-03 | POST /api/auth/login | 2FA enabled, no TOTP returns `{ requires2FA: true }` | PASS | 413ms |
| IT-04 | POST /api/auth/login | Valid creds + valid TOTP returns JWT + venueId | PASS | 419ms |
| IT-05 | POST /api/auth/login | Wrong password returns 401 'Invalid credentials' | PASS | 414ms |

**Notes:**
- Auth tests are slower (~400ms each) because `bcrypt.hash(..., 12)` is genuinely expensive. Acceptable for real integration coverage.
- IT-01 verifies `qrCode` is a base64 PNG data URL (`^data:image/png;base64,`).
- IT-04 generates a real TOTP with `speakeasy.totp()` using the admin's stored secret.
- IT-03/IT-04 create admins directly in the DB with `twoFactorEnabled: true` (bypassing the `/verify-2fa-setup` flow) so the login logic can be tested in isolation.

---

### `__tests__/integration/songs.test.js`

| ID    | Endpoint | Test | Status | Duration |
|-------|----------|------|--------|----------|
| IT-06 | GET /api/songs/search?q=test | Returns array of song objects with isExplicit field | PASS | 7ms |
| IT-07 | POST /api/songs/:venueId | New song returns 201 with `{ song, queueEntry }` | PASS | 151ms |
| IT-08 | POST /api/songs/:venueId | Duplicate youtubeId returns 409 'Song already in queue' | PASS | 12ms |
| IT-09 | POST /api/songs/:venueId | Explicit song + filter ON returns 403 | PASS | 4ms |
| IT-10 | POST /api/songs/:venueId | 3rd song by same fingerprint returns 403 | PASS | 34ms |
| IT-11 | DELETE /api/songs/:venueId/:songId | Own song returns 200 | PASS | 8ms |
| IT-12 | DELETE /api/songs/:venueId/:songId | Other user's song returns 403 | PASS | 6ms |

**Notes:**
- IT-06 mocks `axios` — no real YouTube API call.
- IT-09 creates a venue with `settings.explicitFilter: true` then attempts to add an explicit song.
- IT-10 tests the "max 2 songs per fingerprint" enforcement which checks `ActiveQueue.countDocuments({ songId: { $in: userSongs } })`.

---

### `__tests__/integration/votes.test.js`

| ID    | Endpoint | Test | Status | Duration |
|-------|----------|------|--------|----------|
| IT-13 | POST /api/votes/:songId | Valid vote returns 200 with voteCount=1 | PASS | 164ms |
| IT-14 | POST /api/votes/:songId | Duplicate fingerprint returns 409 'Already voted' | PASS | 8ms |
| IT-15 | DELETE /api/votes/:songId | Valid undo returns 200 with decremented count | PASS | 8ms |
| IT-16 | DELETE /api/votes/:songId | Undo without prior vote returns 400 | PASS | 4ms |

**Notes:**
- Each test uses `beforeEach` to seed a fresh Venue + Song + ActiveQueue entry.
- `voteLimiter` is mocked as a no-op so the test requests aren't rate-limited.

---

### `__tests__/integration/admin.test.js`

| ID    | Endpoint | Test | Status | Duration |
|-------|----------|------|--------|----------|
| IT-17 | POST /api/admin/skip | Valid JWT returns 200 | PASS | 194ms |
| IT-18 | POST /api/admin/skip | No JWT returns 401 'No token provided' | PASS | 2ms |

**Notes:**
- IT-17 signs a JWT with `'fallback_dev_secret'` (matches `src/config/env.js` default). Pre-creates a PlaybackState so the skip logic has something to operate on.
- The skip endpoint response body is `{ success: true }` regardless of whether there's a next song — test asserts success status + success body.

---

# 3. WebSocket Tests (5/5 PASSED)

These tests spin up a **real HTTP server + real Socket.IO server** bound to a random port, register the production handlers via `registerHandlers(io)`, and connect real `socket.io-client` instances. No socket mocking — end-to-end event delivery is verified.

### `__tests__/integration/websocket.test.js`

| ID    | Event Flow | Test | Status | Duration |
|-------|------------|------|--------|----------|
| WS-01 | join_venue | Client joins room and receives subsequent broadcasts | PASS | 123ms |
| WS-02 | cast_vote → update_tally | Client A votes, Client B (in room) receives `{songId, newCount}` | PASS | 134ms |
| WS-03 | queue_updated | Song added via API, all venue clients receive sorted queue array | PASS | 137ms |
| WS-04 | progress_update → playback_progress | Admin sends progress, guest receives `{currentTime, duration}` | PASS | 105ms |
| WS-05 | song_reaction → reaction_update | Guest sends reaction, all clients in room receive it | PASS | 105ms |

**Notes:**
- WS-02 uses the real `castVote` function which modifies the DB AND emits via the real `socketManager.emitToVenue`. End-to-end verification.
- WS-03 combines REST + WebSocket: a `supertest` POST to `/api/songs/:venueId` triggers `emitToVenue('queue_updated', ...)` which reaches both connected clients.
- WS-04 verifies that `socket.to(room).emit(...)` broadcasts to OTHERS in the room (sender excluded).
- WS-05 verifies that `io.to(room).emit(...)` broadcasts to ALL in the room (sender included).
- Each test has a 3-second timeout on event waits — if a broadcast doesn't arrive, the test fails loudly rather than hanging.

---

## What Was Changed in Production Code

| File | Change | Reason |
|------|--------|--------|
| `src/services/voteController.js` | Added `undoVote(songId, fingerprint, venueId)` | Tests UT-13/14/15 target the controller, but undo logic was inline in the route |
| `src/routes/votes.js` | DELETE handler now calls `undoVote()` instead of inline logic | Keeps route thin, consistent with castVote pattern |

No other production code was modified to make tests pass.

---

## Infrastructure Added

| File | Purpose |
|------|---------|
| `jest.config.js` | Jest config: node environment, 30s timeout |
| `package.json` | Added `"test": "jest --runInBand"` script + devDependencies (jest, supertest, mongodb-memory-server, socket.io-client) |
| `__tests__/helpers/db.js` | MongoMemoryServer connect/close/clear helpers |
| `__tests__/helpers/app.js` | Express app factory mounting all routes |
| `__tests__/unit/voteController.test.js` | UT-01, 02, 03, 13, 14, 15 |
| `__tests__/unit/authMiddleware.test.js` | UT-04, 05, 06 |
| `__tests__/unit/rateLimiter.test.js` | UT-07, 08, 22, 23 |
| `__tests__/unit/youtubeService.test.js` | UT-09 |
| `__tests__/unit/models.test.js` | UT-10, 11, 12, 16, 17, 18, 19, 20, 21, 24 |
| `__tests__/integration/auth.test.js` | IT-01, 02, 03, 04, 05 |
| `__tests__/integration/songs.test.js` | IT-06, 07, 08, 09, 10, 11, 12 |
| `__tests__/integration/votes.test.js` | IT-13, 14, 15, 16 |
| `__tests__/integration/admin.test.js` | IT-17, 18 |
| `__tests__/integration/websocket.test.js` | WS-01, 02, 03, 04, 05 |
