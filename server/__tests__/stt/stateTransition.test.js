// State Transition tests for the admin auth FSM.
//
// States: UNAUTHENTICATED -> PASSWORD_VERIFIED -> AUTHENTICATED
//         Any bad input -> REJECTED (recoverable via retry)
//
// We drive a small AuthFSM helper that wraps the REAL /api/auth endpoints.
// State transitions are computed from actual HTTP responses — the helper
// never fabricates state. "logout" is a client-side action (the real app
// just clears localStorage) so we model it as an FSM-only transition
// without hitting any endpoint.

jest.mock('../../src/services/socketManager', () => ({
  emitToVenue: jest.fn(),
  init: jest.fn(),
  getIo: jest.fn(),
}));

jest.mock('../../src/middleware/rateLimiter', () => ({
  voteLimiter: (req, res, next) => next(),
  authLimiter: (req, res, next) => next(),
}));

const request = require('supertest');
const speakeasy = require('speakeasy');
const { connect, close, clear } = require('../helpers/db');
const { createApp } = require('../helpers/app');

const app = createApp();

const STATES = {
  UNAUTH: 'UNAUTHENTICATED',
  PWD_OK: 'PASSWORD_VERIFIED',
  AUTH: 'AUTHENTICATED',
  REJECTED: 'REJECTED',
};

class AuthFSM {
  constructor(email) {
    this.state = STATES.UNAUTH;
    this.email = email;
    this.token = null;
  }

  async enterPassword(password) {
    if (this.state !== STATES.UNAUTH && this.state !== STATES.REJECTED) {
      // any other event from REJECTED keeps it REJECTED unless it's "retry"
      return this.state;
    }
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: this.email, password });
    if (res.status === 200 && res.body.requires2FA) {
      this.state = STATES.PWD_OK;
    } else if (res.status === 200 && res.body.token) {
      // No 2FA configured — shouldn't happen in this test suite
      this.state = STATES.AUTH;
      this.token = res.body.token;
    } else {
      this.state = STATES.REJECTED;
    }
    return this.state;
  }

  async enterTOTP(password, totpCode) {
    if (this.state !== STATES.PWD_OK) return this.state;
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: this.email, password, totpCode });
    if (res.status === 200 && res.body.token) {
      this.state = STATES.AUTH;
      this.token = res.body.token;
    } else {
      this.state = STATES.REJECTED;
    }
    return this.state;
  }

  logout() {
    if (this.state === STATES.AUTH) {
      this.state = STATES.UNAUTH;
      this.token = null;
    }
    return this.state;
  }

  retry() {
    if (this.state === STATES.REJECTED) {
      this.state = STATES.UNAUTH;
    }
    return this.state;
  }

  otherEvent() {
    // "any other" event from REJECTED keeps state
    return this.state;
  }
}

// Helper: register an admin with 2FA enabled and return the TOTP secret
const registerAdmin = async (email, password, venueName) => {
  const reg = await request(app)
    .post('/api/auth/register')
    .send({ email, password, venueName });
  const secret = reg.body.secret;
  const setupToken = reg.body.setupToken;
  const code = speakeasy.totp({ secret, encoding: 'base32' });
  await request(app).post('/api/auth/verify-2fa-setup').send({ setupToken, token: code });
  return { secret };
};

const validCode = (secret) => speakeasy.totp({ secret, encoding: 'base32' });

beforeAll(async () => await connect());
afterAll(async () => await close());

let secret;
const EMAIL = 'stt@ev.com';
const PASS = 'pw-correct';

beforeEach(async () => {
  await clear();
  ({ secret } = await registerAdmin(EMAIL, PASS, 'STT Venue'));
});

// STT-01
test('STT-01: UNAUTH + validPassword -> PASSWORD_VERIFIED', async () => {
  const fsm = new AuthFSM(EMAIL);
  expect(fsm.state).toBe(STATES.UNAUTH);
  await fsm.enterPassword(PASS);
  expect(fsm.state).toBe(STATES.PWD_OK);
});

// STT-02
test('STT-02: UNAUTH + invalidPassword -> REJECTED', async () => {
  const fsm = new AuthFSM(EMAIL);
  await fsm.enterPassword('wrong-password');
  expect(fsm.state).toBe(STATES.REJECTED);
});

// STT-03
test('STT-03: PASSWORD_VERIFIED + validTOTP -> AUTHENTICATED', async () => {
  const fsm = new AuthFSM(EMAIL);
  await fsm.enterPassword(PASS);
  await fsm.enterTOTP(PASS, validCode(secret));
  expect(fsm.state).toBe(STATES.AUTH);
  expect(fsm.token).toBeTruthy();
});

// STT-04
test('STT-04: PASSWORD_VERIFIED + invalidTOTP -> REJECTED', async () => {
  const fsm = new AuthFSM(EMAIL);
  await fsm.enterPassword(PASS);
  await fsm.enterTOTP(PASS, '000000');
  expect(fsm.state).toBe(STATES.REJECTED);
});

// STT-05
test('STT-05: AUTHENTICATED + logout -> UNAUTHENTICATED', async () => {
  const fsm = new AuthFSM(EMAIL);
  await fsm.enterPassword(PASS);
  await fsm.enterTOTP(PASS, validCode(secret));
  expect(fsm.state).toBe(STATES.AUTH);
  fsm.logout();
  expect(fsm.state).toBe(STATES.UNAUTH);
  expect(fsm.token).toBeNull();
});

// STT-06
test('STT-06: REJECTED + retry -> UNAUTHENTICATED', async () => {
  const fsm = new AuthFSM(EMAIL);
  await fsm.enterPassword('nope');
  expect(fsm.state).toBe(STATES.REJECTED);
  fsm.retry();
  expect(fsm.state).toBe(STATES.UNAUTH);
});

// STT-07
test('STT-07: REJECTED + any other event -> still REJECTED', async () => {
  const fsm = new AuthFSM(EMAIL);
  await fsm.enterPassword('nope');
  expect(fsm.state).toBe(STATES.REJECTED);
  // enterTOTP while REJECTED is an "other" event — helper returns current state
  const after = await fsm.enterTOTP(PASS, validCode(secret));
  expect(after).toBe(STATES.REJECTED);
  expect(fsm.otherEvent()).toBe(STATES.REJECTED);
});

// STT-08
test('STT-08: full happy path: pass -> TOTP -> AUTHENTICATED', async () => {
  const fsm = new AuthFSM(EMAIL);
  const s1 = await fsm.enterPassword(PASS);
  const s2 = await fsm.enterTOTP(PASS, validCode(secret));
  expect(s1).toBe(STATES.PWD_OK);
  expect(s2).toBe(STATES.AUTH);
});

// STT-09
test('STT-09: full reject path: pass -> bad TOTP -> REJECTED', async () => {
  const fsm = new AuthFSM(EMAIL);
  await fsm.enterPassword(PASS);
  await fsm.enterTOTP(PASS, '111111');
  expect(fsm.state).toBe(STATES.REJECTED);
});

// STT-10
test('STT-10: recovery: reject -> retry -> success -> AUTHENTICATED', async () => {
  const fsm = new AuthFSM(EMAIL);
  await fsm.enterPassword('nope');
  expect(fsm.state).toBe(STATES.REJECTED);
  fsm.retry();
  expect(fsm.state).toBe(STATES.UNAUTH);
  await fsm.enterPassword(PASS);
  await fsm.enterTOTP(PASS, validCode(secret));
  expect(fsm.state).toBe(STATES.AUTH);
});

// STT-11
test('STT-11: full cycle: login -> logout -> login -> AUTHENTICATED', async () => {
  const fsm = new AuthFSM(EMAIL);
  await fsm.enterPassword(PASS);
  await fsm.enterTOTP(PASS, validCode(secret));
  expect(fsm.state).toBe(STATES.AUTH);
  fsm.logout();
  expect(fsm.state).toBe(STATES.UNAUTH);
  await fsm.enterPassword(PASS);
  await fsm.enterTOTP(PASS, validCode(secret));
  expect(fsm.state).toBe(STATES.AUTH);
});
