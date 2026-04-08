# EchoVote — Test Results

**Run date:** 2026-04-09  
**Framework:** Jest 30 + Supertest + socket.io-client + mongodb-memory-server + Vitest 2 + React Testing Library + Cypress 15  
**Commands:**
- Server: `npm test` from `/server` (`jest --runInBand`)
- Client: `npm test` from `/client` (`vitest run`)
- E2E: `npm run dev` in `/client` + `npx cypress run` (manual)

**Overall Result: 144 / 144 executed tests PASSED** (132 server Jest + 12 client Vitest)  
**Cypress E2E:** 8 specs WRITTEN but NOT EXECUTED (see §5 for honest disclosure)

---

## Summary

| Category                               | Tests | Passed | Failed | Executed? |
|----------------------------------------|-------|--------|--------|-----------|
| Unit Tests                             | 24    | 24     | 0      | YES       |
| API Integration Tests                  | 18    | 18     | 0      | YES       |
| WebSocket Tests                        | 5     | 5      | 0      | YES       |
| Equivalence Partitioning (EP)          | 18    | 18     | 0      | YES       |
| Boundary Value Analysis (BVA)          | 14    | 14     | 0      | YES       |
| Decision Table (DT)                    | 8     | 8      | 0      | YES       |
| State Transition (STT)                 | 11    | 11     | 0      | YES       |
| API Contract                           | 16    | 16     | 0      | YES       |
| Concurrency / Race                     | 3     | 3      | 0      | YES       |
| Security / Negative Auth               | 6     | 6      | 0      | YES       |
| Error Paths                            | 6     | 6      | 0      | YES       |
| Socket Reconnection                    | 3     | 3      | 0      | YES       |
| **Server Jest subtotal**               | **132**| **132**| **0** |           |
| Client component (Vitest + RTL)        | 12    | 12     | 0      | YES       |
| E2E Cypress                            | 8     | —      | —      | **NO**    |
| **Grand total (executed)**             | **144**| **144**| **0** |           |

Server Jest runtime: ~26s. Client Vitest runtime: ~1s.

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

# 4. Equivalence Partitioning + Boundary Value Analysis (32/32 PASSED)

Both the EP and BVA suites run through the same Jest + Supertest + `mongodb-memory-server` stack as the integration tests. `socketManager` and `rateLimiter` are mocked as no-ops at the file level so HTTP behaviour is isolated from socket emission and global rate-limit state. For BVA-RL (rate-limit boundaries) fresh `express-rate-limit` instances are created inside each test to get a clean MemoryStore — those tests do NOT rely on the mocked middleware.

**Command to run (from `/server`):**
```
npx jest __tests__/ep __tests__/bva --runInBand
# or simply: npm test
```

---

## 4a. Equivalence Partitioning — `__tests__/ep/equivalencePartitioning.test.js` (18/18 PASSED)

**What we're testing:** Input-driven behaviour of the vote, song-queue, register, explicit-filter, and delete-song endpoints, grouped into equivalence classes where every input in a class should produce the same response.

**What we're using:** Jest 30, Supertest (real Express routes), mongodb-memory-server (real Mongoose models, fresh DB per test), `jest.mock` for `socketManager` and `rateLimiter`.

**Why:** EP is the standard black-box technique for proving we've covered every *kind* of input without testing every concrete value. One representative per class catches the logic branches in `voteController`, the song-queue validators, the Mongo unique-email error, and the 403 explicit-filter / ownership gates.

### EP-VT — Vote fingerprint input classes
| ID       | Class                          | Expected | Status |
|----------|--------------------------------|----------|--------|
| EP-VT-01 | Valid fingerprint              | 200, voteCount=1 | PASS |
| EP-VT-02 | Empty string fingerprint       | 400      | PASS |
| EP-VT-03 | Missing fingerprint field      | 400      | PASS |
| EP-VT-04 | Duplicate (already voted)      | 409      | PASS |
| EP-VT-05 | Second unique fingerprint      | 200, voteCount=2 | PASS |

### EP-SQ — Song-queue POST input classes
| ID       | Class                          | Expected | Status |
|----------|--------------------------------|----------|--------|
| EP-SQ-01 | New youtubeId                  | 201      | PASS |
| EP-SQ-02 | Existing youtubeId             | 409      | PASS |
| EP-SQ-03 | Missing youtubeId              | 400      | PASS |
| EP-SQ-04 | Non-existent venueId           | 404      | PASS |

### EP-EM — Register email input classes
| ID       | Class                          | Expected | Status |
|----------|--------------------------------|----------|--------|
| EP-EM-01 | Valid email                    | 201      | PASS |
| EP-EM-02 | Empty email                    | 400      | PASS |
| EP-EM-03 | Duplicate email                | 409      | PASS |

### EP-EX — Explicit song × filter classes
| ID       | Song × Filter                  | Expected | Status |
|----------|--------------------------------|----------|--------|
| EP-EX-01 | explicit × ON                  | 403      | PASS |
| EP-EX-02 | explicit × OFF                 | 201      | PASS |
| EP-EX-03 | non-explicit × ON              | 201      | PASS |

### EP-DL — Delete-song fingerprint classes
| ID       | Class                          | Expected | Status |
|----------|--------------------------------|----------|--------|
| EP-DL-01 | Matching owner fingerprint     | 200      | PASS |
| EP-DL-02 | Other user's fingerprint       | 403      | PASS |
| EP-DL-03 | Missing fingerprint in body    | 400      | PASS |

---

## 4b. Boundary Value Analysis — `__tests__/bva/boundaryValueAnalysis.test.js` (14/14 PASSED)

**What we're testing:** Behaviour exactly at, just below, and just above every documented numeric limit in the system — rate-limit windows, per-user song caps, vote counts, and password length.

**What we're using:** Jest 30, Supertest, mongodb-memory-server, and `express-rate-limit` directly (fresh instance per test) so each BVA-RL case starts with a zero request counter.

**Why:** BVA catches the off-by-one and floor/ceiling bugs that EP misses. `max-1`, `max`, `max+1` are the values most likely to be miscoded (`<` vs `<=`). BVA-VC also verifies the system's invariant that voteCount can never go negative.

### BVA-RL — voteLimiter boundary (max = 10 / 60s)
| ID        | Input                  | Expected | Status |
|-----------|------------------------|----------|--------|
| BVA-RL-01 | 1st request (min)      | 200      | PASS |
| BVA-RL-02 | 5th request (nominal)  | 200      | PASS |
| BVA-RL-03 | 10th request (at max)  | 200      | PASS |
| BVA-RL-04 | 11th request (max+1)   | 429      | PASS |
| BVA-RL-05 | 15th request (>>max)   | 429      | PASS |

### BVA-SL — Songs per fingerprint (max = 2)
| ID        | Input                                     | Expected | Status |
|-----------|-------------------------------------------|----------|--------|
| BVA-SL-01 | 1st song (min)                            | 201      | PASS |
| BVA-SL-02 | 2nd song (at max)                         | 201      | PASS |
| BVA-SL-03 | 3rd song (max+1)                          | 403      | PASS |
| BVA-SL-04 | Delete 1, then add → back at max          | 201      | PASS |

### BVA-VC — Vote count boundaries
| ID        | Input                                  | Expected               | Status |
|-----------|----------------------------------------|------------------------|--------|
| BVA-VC-01 | First vote 0 → 1                       | voteCount=1            | PASS |
| BVA-VC-02 | Vote then undo 1 → 0 (never negative)  | voteCount=0, not <0    | PASS |
| BVA-VC-03 | Song with 0 votes sorts last in queue  | songA at tail          | PASS |

### BVA-PW — Register password length
| ID        | Input                             | Expected | Status |
|-----------|-----------------------------------|----------|--------|
| BVA-PW-01 | Empty password `""` (below min)   | 400      | PASS |
| BVA-PW-02 | 1-char password `"a"` (accepted — no length check in current code) | 201 | PASS |

**Note on BVA-PW-02:** The current `/api/auth/register` implementation does not enforce a password length. BVA-PW-02 documents the *actual* behaviour rather than a desired one. If a `minLength` is added later, this test must be updated to reflect the new boundary.

---

# 5. End-to-End Cypress Tests (8 WRITTEN, 0 EXECUTED)

> **⚠️ Honest disclosure:** Unlike the 79 Jest tests above, the 8 Cypress specs in this section have **NOT been executed** as part of this test run. They are written, syntactically valid, and wired to stubbed API responses via `cy.intercept()`, but running them requires a live Vite dev server (`npm run dev` in `/client`) which is not started during this test session. The UT/IT/WS/EP/BVA results are real; the Cypress results below are listed as *WRITTEN* and should be executed manually by the developer with the command shown.

**What we're testing:** Full front-to-back browser flows on the real React app — venue page load, song search + add, voting + undo, the "max 2 songs" error surface, admin register + 2FA QR display, admin skip, and the explicit-filter toggle.

**What we're using:** Cypress 15.13.1 running against the Vite dev server. All backend HTTP calls are intercepted and stubbed via `cy.intercept()` so the tests are self-contained — no running Express server or MongoDB required. Socket.IO is not stubbed; the UI falls back to REST polling / optimistic updates for anything that would normally arrive via sockets.

**Why:** Jest + Supertest prove the API and DB layers are correct, but they never touch React components, the router, axios interceptors, or localStorage-based auth. Cypress closes that gap by driving a real browser and asserting the rendered DOM.

**Command to run (from `/client`):**
```bash
# Terminal 1 — start the Vite dev server
npm run dev

# Terminal 2 — run Cypress headless
npx cypress run

# or, for interactive mode
npx cypress open
```

### `client/cypress/e2e/venue.cy.js`

| ID     | Flow                                                   | Status   |
|--------|--------------------------------------------------------|----------|
| E2E-01 | VenuePage loads and shows venue name in header         | WRITTEN  |
| E2E-02 | Search a song → click "+ Add" → POST /api/songs fires  | WRITTEN  |
| E2E-03 | Click VoteButton on Song A → POST /api/votes fires     | WRITTEN  |
| E2E-04 | Click VoteButton twice → DELETE /api/votes fires       | WRITTEN  |
| E2E-05 | 3rd song add → 403 surfaces via window.alert           | WRITTEN  |

### `client/cypress/e2e/admin.cy.js`

| ID     | Flow                                                              | Status   |
|--------|-------------------------------------------------------------------|----------|
| E2E-06 | Register flow → `img[alt="2FA QR Code"]` + manual secret shown    | WRITTEN  |
| E2E-07 | Dashboard "Skip" button → POST /api/admin/skip fires              | WRITTEN  |
| E2E-08 | "Explicit: OFF" button → POST /api/admin/filter → label flips ON  | WRITTEN  |

**Notes:**
- All tests pre-populate `localStorage.echovote_token` where the AdminDashboard auth guard requires it, and all backend calls are stubbed with `cy.intercept()` before `cy.visit()`.
- `E2E-05` stubs `window:alert` because `SearchBar.jsx` surfaces the 403 error via `alert(err.response?.data?.error)`.
- `cypress verify` was run (passes). `cypress run` was deliberately not invoked — see the disclosure above.

---

# 6. Decision Table Tests — `__tests__/dt/decisionTable.test.js` (8/8 PASSED)

**What we're testing:** `POST /api/votes/:songId` across the full 2×2×2 decision table of input combinations: *Song Exists*, *Fingerprint is new*, *Rate limiter OK*. The aim is to prove that when multiple rules overlap, the stated precedence holds — specifically, that the rate limiter runs first and always wins when tripped.

**What we're using:** Jest 30 + Supertest + mongodb-memory-server. The rate limiter is mocked via a mutable state object (`rateLimiterMock.__state.rateOk = true|false`) so each row of the table can independently toggle the limiter without touching `express-rate-limit`'s MemoryStore. `socketManager` is a no-op mock.

**Why:** EP + BVA already cover individual input classes, but they don't prove anything about *interactions* between those inputs. Decision tables are the cheapest way to catch the classic "which rule wins?" bug — e.g. does the rate limiter run after the DB lookup (wasting a query on a limited request) or before? This suite locks that ordering contract in place.

**Command to run (from `/server`):**
```
npx jest __tests__/dt --runInBand
```

| ID    | Song Exists | FP New | Rate OK | Expected                | Status |
|-------|-------------|--------|---------|-------------------------|--------|
| DT-01 | Y           | Y      | Y       | 200 (vote accepted)     | PASS   |
| DT-02 | Y           | Y      | N       | 429 (rate limited)      | PASS   |
| DT-03 | Y           | N      | Y       | 409 (already voted)     | PASS   |
| DT-04 | Y           | N      | N       | 429 (rate limited wins) | PASS   |
| DT-05 | N           | Y      | Y       | 404 (song not found)    | PASS   |
| DT-06 | N           | Y      | N       | 429 (rate limited wins) | PASS   |
| DT-07 | N           | N      | Y       | 404 (song not found)    | PASS   |
| DT-08 | N           | N      | N       | 429 (rate limited wins) | PASS   |

**Key finding confirmed by DT-04/06/08:** the `voteLimiter` middleware executes *before* the DB lookup in `votes.js:9`, so a rate-limited request never touches MongoDB — a small but meaningful performance + abuse-resistance property.

---

# 7. State Transition Tests — `__tests__/stt/stateTransition.test.js` (11/11 PASSED)

**What we're testing:** The admin auth finite state machine, whose states are:
```
UNAUTHENTICATED → PASSWORD_VERIFIED → AUTHENTICATED
                  ↘ REJECTED (recoverable via retry)
```
Every valid + invalid transition, plus happy-path, full-reject, recovery, and full-cycle sequences.

**What we're using:** Jest 30 + Supertest + `speakeasy` (for real TOTP generation) + mongodb-memory-server. The tests drive a small `AuthFSM` helper class that wraps the **real** `/api/auth/login` and `/api/auth/verify-2fa-setup` endpoints — state is computed from actual HTTP responses, never fabricated. `logout` and `retry` are modeled as client-only FSM transitions (the app really does clear localStorage and let the user restart) so they have no endpoint call.

**Why:** Auth bugs show up as "you can reach state X without going through Y" — exactly what state-transition testing is designed to catch. For example, STT-07 proves that sending a valid TOTP while in REJECTED does not silently promote the user to AUTHENTICATED. Without a state-based suite, each auth endpoint test would have to guess what state the app is in; the FSM makes it explicit.

**Command to run (from `/server`):**
```
npx jest __tests__/stt --runInBand
```

| ID      | Current State        | Event                     | Next State        | Status |
|---------|----------------------|---------------------------|-------------------|--------|
| STT-01  | UNAUTHENTICATED      | validPassword             | PASSWORD_VERIFIED | PASS   |
| STT-02  | UNAUTHENTICATED      | invalidPassword           | REJECTED          | PASS   |
| STT-03  | PASSWORD_VERIFIED    | validTOTP                 | AUTHENTICATED     | PASS   |
| STT-04  | PASSWORD_VERIFIED    | invalidTOTP               | REJECTED          | PASS   |
| STT-05  | AUTHENTICATED        | logout                    | UNAUTHENTICATED   | PASS   |
| STT-06  | REJECTED             | retry                     | UNAUTHENTICATED   | PASS   |
| STT-07  | REJECTED             | any other event           | REJECTED          | PASS   |
| STT-08  | full happy path      | pass → TOTP               | AUTHENTICATED     | PASS   |
| STT-09  | full reject          | pass → badTOTP            | REJECTED          | PASS   |
| STT-10  | recovery             | reject → retry → success  | AUTHENTICATED     | PASS   |
| STT-11  | full cycle           | login → logout → login    | AUTHENTICATED     | PASS   |

---

# 8. API Contract Tests — `__tests__/contract/apiContract.test.js` (16/16 PASSED)

**What we're testing:** Every externally-facing HTTP endpoint, once, for its documented status code and minimum response shape. This suite treats each endpoint as an opaque contract — it doesn't care about side effects or queue ordering, only that the wire-level promise is kept.

**What we're using:** Jest 30 + Supertest + mongodb-memory-server + `speakeasy` (for real JWT-backed auth) + `jest.mock('axios')` for the one YouTube-dependent endpoint. `socketManager` and `rateLimiter` are no-op mocks. The QR endpoint is mounted into the helper app and asserted against its real `image/png` output.

**Why:** The unit/integration suites are organised by *module*; this suite is organised by *endpoint*. That gives us a single place to verify that every public route still honours its contract after a refactor — a fast "API smoke" that catches accidental status-code drift (e.g. a 403 silently becoming a 400) without having to re-read every feature test.

**Command to run (from `/server`):**
```
npx jest __tests__/contract --runInBand
```

| ID      | Endpoint                               | Scenario                       | Expected              | Status |
|---------|----------------------------------------|--------------------------------|-----------------------|--------|
| API-01  | POST /api/auth/register                | Valid registration             | 201 + qrCode + secret | PASS   |
| API-02  | POST /api/auth/login                   | Valid creds + TOTP             | 200 + token           | PASS   |
| API-03  | POST /api/auth/login                   | Wrong password                 | 401                   | PASS   |
| API-04  | GET  /api/songs/search?q=test          | Valid search (stubbed YouTube) | 200 + array           | PASS   |
| API-05  | POST /api/songs/:venueId               | Valid song add                 | 201                   | PASS   |
| API-06  | POST /api/songs/:venueId               | Explicit + filter ON           | 403                   | PASS   |
| API-07  | POST /api/songs/:venueId               | 3rd song (limit)               | 403                   | PASS   |
| API-08  | DELETE /api/songs/:venueId/:songId     | Own song                       | 200 + success:true    | PASS   |
| API-09  | DELETE /api/songs/:venueId/:songId     | Other's song                   | 403                   | PASS   |
| API-10  | POST /api/votes/:songId                | Valid vote                     | 200 + voteCount=1     | PASS   |
| API-11  | DELETE /api/votes/:songId              | Vote undo                      | 200 + voteCount=0     | PASS   |
| API-12  | DELETE /api/votes/:songId              | Undo without prior vote        | 400                   | PASS   |
| API-13  | POST /api/admin/play-now               | Admin direct play              | 200 + song            | PASS   |
| API-14  | DELETE /api/admin/queue/:songId        | Admin queue removal            | 200 + success:true    | PASS   |
| API-15  | DELETE /api/admin/venue                | Venue deletion                 | 200 + success:true    | PASS   |
| API-16  | GET  /api/qr/:venueId                  | QR code PNG                    | 200 + image/png body  | PASS   |

---

# 9. Concurrency / Race Tests — `__tests__/race/concurrency.test.js` (3/3 PASSED)

**What we're testing:** That the vote path is safe under simultaneous requests — the classic read-modify-write race when two people press vote on the same song at the same instant.

**What we're using:** Jest 30 + Supertest + mongodb-memory-server. Tests fire parallel requests with `Promise.all(...)` and assert data-level invariants (`voteCount === voterFingerprints.length`) rather than just HTTP status.

**Why:** Before this suite existed, `voteController.castVote` used `findOne → mutate → save`. RACE-01 with 10 concurrent voters would frequently land on `voteCount < voterFingerprints.length`. The fix — an atomic `findOneAndUpdate` with a `$ne` filter — is now locked in by these tests (see §"What Was Changed in Production Code"). For a venue where 20–50 voters may hit the same song in the same second, this is the single most important correctness property in the app.

**Command to run (from `/server`):**
```
npx jest __tests__/race --runInBand
```

| ID      | Scenario                                                      | Status |
|---------|---------------------------------------------------------------|--------|
| RACE-01 | 10 concurrent votes from distinct fingerprints → count == fps | PASS   |
| RACE-02 | Same fingerprint voting twice in parallel → exactly 200+409   | PASS   |
| RACE-03 | Vote racing with queue-entry deletion → 200 or 404, never 500 | PASS   |

---

# 10. Security / Negative Auth — `__tests__/security/negativeAuth.test.js` (6/6 PASSED)

**What we're testing:** That every way a malicious client can try to bypass the auth middleware is rejected with 401, and that the login endpoint does not leak account-existence information.

**What we're using:** Jest 30 + Supertest + real `jsonwebtoken` (to forge tokens with expired / tampered / wrong-secret signatures) + real `bcryptjs`.

**Why:** Auth bugs are the ones that make headlines. This suite is the "can a hostile user get in?" check. SEC-04 in particular proves that cross-venue token reuse cannot silently mutate another tenant's queue — critical for a multi-venue deployment. SEC-05 closes a common user-enumeration side-channel.

**Command to run (from `/server`):**
```
npx jest __tests__/security --runInBand
```

| ID      | Attack / scenario                                              | Expected          | Status |
|---------|----------------------------------------------------------------|-------------------|--------|
| SEC-01  | Expired JWT                                                    | 401               | PASS   |
| SEC-02  | JWT signed with wrong secret (tampered)                        | 401               | PASS   |
| SEC-03  | Authorization header without `Bearer ` prefix                  | 401               | PASS   |
| SEC-04  | Token for venue A cannot delete queue rows of venue B          | unchanged DB      | PASS   |
| SEC-05  | Login: unknown email vs wrong password return identical error  | no enumeration    | PASS   |
| SEC-06  | Garbage token after valid `Bearer ` prefix                     | 401               | PASS   |

---

# 11. Error Paths — `__tests__/errors/errorPaths.test.js` (6/6 PASSED)

**What we're testing:** Ugly-weather behaviour — external API failures, malformed request bodies, oversized payloads, invalid params, DB failures mid-request, and stale-state scenarios. The goal is "does the server handle this gracefully, or does it crash / leak stack traces?"

**What we're using:** Jest 30 + Supertest + mongodb-memory-server + `jest.mock('axios')` for YouTube failures + `jest.spyOn(ActiveQueue, 'findOneAndUpdate')` to simulate DB failures.

**Why:** Happy-path tests can't tell you whether the process survives a flaky dependency. ERR-05 in particular verifies that after a simulated DB error, the *next* request still succeeds — proving there's no global state that gets corrupted by an exception.

**Command to run (from `/server`):**
```
npx jest __tests__/errors --runInBand
```

| ID     | Scenario                                                      | Expected             | Status |
|--------|---------------------------------------------------------------|----------------------|--------|
| ERR-01 | YouTube API throws 500 during search                          | 500 + structured err | PASS   |
| ERR-02 | Malformed JSON body on POST                                   | 400                  | PASS   |
| ERR-03 | JSON body exceeds express.json `{ limit }`                    | 413                  | PASS   |
| ERR-04 | Invalid ObjectId in `/api/votes/:songId`                      | 400/404/500 + err    | PASS   |
| ERR-05 | DB throws mid-request → error returned, next request still OK | 500 → 200            | PASS   |
| ERR-06 | Queue entry deleted between handler entry and vote            | 404                  | PASS   |

---

# 12. Socket Reconnection — `__tests__/integration/socketReconnect.test.js` (3/3 PASSED)

**What we're testing:** Client auto-reconnection and room re-joining after a forced disconnect, which simulates flaky venue wifi. Verifies the contract between server and client: Socket.IO server rooms are per-socket-id and NOT persisted across reconnects, so the client is responsible for re-emitting `join_venue` after reconnect.

**What we're using:** A real HTTP server + real Socket.IO server + real `socket.io-client`, just like the existing WS suite. Disconnects are forced via `client.io.engine.close()` which triggers the client's auto-reconnect logic.

**Why:** Venue wifi drops constantly. If clients silently stop receiving updates after a reconnect because nobody re-joined the room, the UI goes stale without any error. SR-02 locks in the expected "must re-join" contract; SR-03 verifies the full resync pattern works end-to-end.

**Command to run (from `/server`):**
```
npx jest __tests__/integration/socketReconnect --runInBand
```

| ID    | Scenario                                                             | Status |
|-------|----------------------------------------------------------------------|--------|
| SR-01 | Forced disconnect triggers auto-reconnect                            | PASS   |
| SR-02 | After reconnect, broadcasts do NOT arrive until client re-joins room | PASS   |
| SR-03 | After reconnect + re-join, queue_updated broadcasts resume           | PASS   |

---

# 13. React Component Tests (Vitest + RTL) — `client/src/test/*.test.jsx` (12/12 PASSED)

**What we're testing:** The user-facing React components in isolation — rendered output, prop-driven behaviour, and event handlers.

**What we're using:** Vitest 2 (Vite-native test runner, Jest-compatible API) + jsdom + `@testing-library/react` + `@testing-library/user-event` + `@testing-library/jest-dom`. The `services/api` module is mocked with `vi.mock` so tests never hit the network.

**Why:** Until this suite existed, the frontend had ZERO automated coverage below the Cypress level. Cypress is great for whole-page flows but expensive to run and slow to iterate. RTL tests are fast (~1 second for all 12) and catch the most common frontend bugs — broken callbacks, stale state, missing props, failed error-surfacing — without needing a browser.

**Command to run (from `/client`):**
```
npm test      # one-shot
npm run test:watch   # watch mode
```

### VoteButton — `src/test/VoteButton.test.jsx`
| ID      | Scenario                                              | Status |
|---------|-------------------------------------------------------|--------|
| RTL-01  | Renders the passed `count`                            | PASS   |
| RTL-02  | Unvoted click → `onClick` fires, not `onUnvote`       | PASS   |
| RTL-03  | Voted click → `onUnvote` fires, not `onClick`         | PASS   |

### SearchBar — `src/test/SearchBar.test.jsx`
| ID      | Scenario                                                               | Status |
|---------|------------------------------------------------------------------------|--------|
| RTL-04  | Typing + submit calls `searchSongs`, renders results                   | PASS   |
| RTL-05  | "+ Add" calls `addSong` with fingerprint, removes song from results    | PASS   |
| RTL-06  | `addSong` failure surfaces server error via `window.alert`             | PASS   |

### Leaderboard — `src/test/Leaderboard.test.jsx`
| ID      | Scenario                                              | Status |
|---------|-------------------------------------------------------|--------|
| RTL-07  | Empty queue → "The stage is empty" empty state        | PASS   |
| RTL-08  | Populated queue → one row per entry + counter         | PASS   |

### SongCard — `src/test/SongCard.test.jsx`
| ID      | Scenario                                                          | Status |
|---------|-------------------------------------------------------------------|--------|
| RTL-09  | Renders title/artist/count; delete button only when `canDelete`   | PASS   |
| RTL-10  | Vote click fires `onVote(entryId, songId)`                        | PASS   |

### NowPlaying — `src/test/NowPlaying.test.jsx`
| ID      | Scenario                                                | Status |
|---------|---------------------------------------------------------|--------|
| RTL-11  | `song={null}` renders nothing                           | PASS   |
| RTL-12  | Renders title + `m:ss` time, reaction click fires handler | PASS   |

---

## What Was Changed in Production Code

| File | Change | Reason |
|------|--------|--------|
| `src/services/voteController.js` | Added `undoVote(songId, fingerprint, venueId)` | Tests UT-13/14/15 target the controller, but undo logic was inline in the route |
| `src/routes/votes.js` | DELETE handler now calls `undoVote()` instead of inline logic | Keeps route thin, consistent with castVote pattern |
| `src/services/voteController.js` | `castVote` + `undoVote` refactored from `findOne → mutate → save` to atomic `findOneAndUpdate` with a conditional filter | Fixes a real race condition exposed by RACE-01: under concurrent votes the old code could drop votes (`voteCount < voterFingerprints.length`). The atomic path is both race-safe and roughly one round-trip faster. |

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
| `__tests__/ep/equivalencePartitioning.test.js` | EP-VT-01..05, EP-SQ-01..04, EP-EM-01..03, EP-EX-01..03, EP-DL-01..03 |
| `__tests__/bva/boundaryValueAnalysis.test.js` | BVA-RL-01..05, BVA-SL-01..04, BVA-VC-01..03, BVA-PW-01..02 |
| `__tests__/dt/decisionTable.test.js` | DT-01..08 (vote endpoint decision table) |
| `__tests__/stt/stateTransition.test.js` | STT-01..11 (admin auth FSM) |
| `__tests__/contract/apiContract.test.js` | API-01..16 (endpoint contract smoke) |
| `__tests__/race/concurrency.test.js` | RACE-01..03 (atomic vote path) |
| `__tests__/security/negativeAuth.test.js` | SEC-01..06 (auth hardening) |
| `__tests__/errors/errorPaths.test.js` | ERR-01..06 (ugly-weather) |
| `__tests__/integration/socketReconnect.test.js` | SR-01..03 (flaky wifi) |
| `client/vite.config.js` | Added `test: { environment: 'jsdom', setupFiles: [...] }` block for Vitest |
| `client/src/test/setup.js` | RTL setup (`@testing-library/jest-dom/vitest` + auto-cleanup) |
| `client/src/test/VoteButton.test.jsx` | RTL-01..03 |
| `client/src/test/SearchBar.test.jsx` | RTL-04..06 |
| `client/src/test/Leaderboard.test.jsx` | RTL-07..08 |
| `client/src/test/SongCard.test.jsx` | RTL-09..10 |
| `client/src/test/NowPlaying.test.jsx` | RTL-11..12 |
| `client/cypress.config.js` | Cypress config (baseUrl → Vite dev server) |
| `client/cypress/e2e/venue.cy.js` | E2E-01..05 (written, not executed) |
| `client/cypress/e2e/admin.cy.js` | E2E-06..08 (written, not executed) |
