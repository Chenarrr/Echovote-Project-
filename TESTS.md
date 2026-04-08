# EchoVote — Unit Test Results

**Run date:** 2026-04-08  
**Framework:** Jest 30 + Supertest + mongodb-memory-server  
**Command:** `npm test` (`jest --runInBand`)  
**Result: 24 / 24 PASSED — 0 FAILED**

---

## Summary

| Suites | Tests | Passed | Failed | Duration |
|--------|-------|--------|--------|----------|
| 5      | 24    | 24     | 0      | ~4.8s    |

---

## Test Files

### `__tests__/unit/voteController.test.js`

Tests the `castVote` and `undoVote` functions from `src/services/voteController.js`.  
Uses `mongodb-memory-server` for an in-memory DB. `socketManager` is fully mocked.

| ID    | Test | Status | Duration |
|-------|------|--------|----------|
| UT-01 | castVote increments voteCount and stores fingerprint | ✅ PASS | 114ms |
| UT-02 | castVote rejects duplicate fingerprint | ✅ PASS | 6ms |
| UT-03 | castVote throws for non-existent songId | ✅ PASS | 2ms |
| UT-13 | undoVote decrements voteCount from 1 to 0 | ✅ PASS | 6ms |
| UT-14 | undoVote removes fingerprint from voterFingerprints | ✅ PASS | 6ms |
| UT-15 | undoVote without prior vote throws error | ✅ PASS | 2ms |

**Notes:**
- `undoVote` was extracted from the inline DELETE route handler into `voteController.js` to make it unit-testable. The route was updated to call `undoVote`.
- `emitToVenue` is mocked — socket emission is not tested here.

---

### `__tests__/unit/authMiddleware.test.js`

Tests `src/middleware/auth.js` via a minimal Express app + Supertest. No DB required.  
JWT secret uses the default fallback `'fallback_dev_secret'` (matches `src/config/env.js`).

| ID    | Test | Status | Duration |
|-------|------|--------|----------|
| UT-04 | Valid JWT passes middleware and sets req.admin | ✅ PASS | 3ms |
| UT-05 | Missing Bearer token returns 401 | ✅ PASS | 1ms |
| UT-06 | Expired JWT returns 401 | ✅ PASS | 1ms |

**Notes:**
- UT-06 uses a token with `exp` set 1 hour in the past to simulate expiry without `setTimeout`.
- UT-04 verifies `res.body.admin` contains both `adminId` and `venueId`.

---

### `__tests__/unit/rateLimiter.test.js`

Tests rate limiting behaviour via fresh Express app instances with new `rateLimit` instances per test.  
Fresh instances ensure each test starts with zero request count.

| ID    | Test | Status | Duration |
|-------|------|--------|----------|
| UT-07 | voteLimiter: allows first 10 requests (200) | ✅ PASS | 15ms |
| UT-08 | voteLimiter: blocks 11th request (429) | ✅ PASS | 8ms |
| UT-22 | authLimiter: allows first 20 requests (200) | ✅ PASS | 6ms |
| UT-23 | authLimiter: blocks 21st request (429) | ✅ PASS | 7ms |

**Notes:**
- Each test calls `beforeEach` which creates a fresh `express()` + fresh `rateLimit()` instance, giving a clean MemoryStore.
- `voteLimiter`: windowMs=60s, max=10. `authLimiter`: windowMs=15min, max=20. Configs match production exactly.

---

### `__tests__/unit/youtubeService.test.js`

Tests `src/services/youtubeService.js`. `axios` is fully mocked — no real HTTP calls.

| ID    | Test | Status | Duration |
|-------|------|--------|----------|
| UT-09 | searchYouTube returns mapped results with expected shape | ✅ PASS | <1ms |

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
| UT-10 | Song: missing youtubeId fails with ValidationError | ✅ PASS | 13ms |
| UT-11 | Admin: duplicate email fails with code 11000 | ✅ PASS | 120ms |
| UT-12 | ActiveQueue: voterFingerprints defaults to [] | ✅ PASS | 5ms |
| UT-16 | Song: isExplicit defaults to false | ✅ PASS | 1ms |
| UT-17 | Song: addedBy stores the fingerprint string | ✅ PASS | 2ms |
| UT-18 | Venue: explicitFilter defaults to false | ✅ PASS | 1ms |
| UT-19 | Venue: pre-delete hook removes linked admin | ✅ PASS | 10ms |
| UT-20 | PlaybackState: isPlaying defaults to false | ✅ PASS | 2ms |
| UT-21 | PlaybackState: currentSongId defaults to null | ✅ PASS | 1ms |
| UT-24 | ActiveQueue: voteCount defaults to 0 | ✅ PASS | 3ms |

**Notes:**
- UT-11 (120ms) is slower due to Mongoose ensuring the unique index is built before the second insert.
- UT-19 uses `Venue.findOneAndDelete()` which is the only method that triggers the `pre('findOneAndDelete')` hook defined in `Venue.js`. Using `deleteOne` or `remove` would NOT trigger the hook.

---

## What Was Changed in Production Code

| File | Change | Reason |
|------|--------|--------|
| `src/services/voteController.js` | Added `undoVote(songId, fingerprint, venueId)` | Tests UT-13/14/15 target the controller, but undo logic was inline in the route |
| `src/routes/votes.js` | DELETE handler now calls `undoVote()` instead of inline logic | Keeps route thin, consistent with castVote pattern |

---

## Infrastructure Added

| File | Purpose |
|------|---------|
| `jest.config.js` | Jest config: node environment, 30s timeout |
| `package.json` | Added `"test": "jest --runInBand"` script |
| `__tests__/helpers/db.js` | MongoMemoryServer connect/close/clear helpers |
| `__tests__/unit/voteController.test.js` | UT-01, 02, 03, 13, 14, 15 |
| `__tests__/unit/authMiddleware.test.js` | UT-04, 05, 06 |
| `__tests__/unit/rateLimiter.test.js` | UT-07, 08, 22, 23 |
| `__tests__/unit/youtubeService.test.js` | UT-09 |
| `__tests__/unit/models.test.js` | UT-10, 11, 12, 16, 17, 18, 19, 20, 21, 24 |
