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
const bcrypt = require('bcryptjs');
const speakeasy = require('speakeasy');
const { connect, close, clear } = require('../helpers/db');
const { createApp } = require('../helpers/app');
const Admin = require('../../src/models/Admin');
const Venue = require('../../src/models/Venue');

const app = createApp();

beforeAll(async () => await connect());
afterAll(async () => await close());
beforeEach(async () => await clear());

// IT-01
test('IT-01: POST /api/auth/register with valid data returns 201 with qrCode+secret+setupRequired', async () => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email: 'newuser@test.com', password: 'pass123', venueName: 'Cool Bar' });

  expect(res.status).toBe(201);
  expect(res.body.setupRequired).toBe(true);
  expect(res.body.qrCode).toBeDefined();
  expect(res.body.qrCode).toMatch(/^data:image\/png;base64,/);
  expect(res.body.secret).toBeDefined();
  expect(res.body.setupToken).toBeDefined();
  expect(res.body.email).toBe('newuser@test.com');
});

// IT-02
test('IT-02: POST /api/auth/register with duplicate email returns 409', async () => {
  await request(app)
    .post('/api/auth/register')
    .send({ email: 'dup@test.com', password: 'pass123', venueName: 'V1' });

  const res = await request(app)
    .post('/api/auth/register')
    .send({ email: 'dup@test.com', password: 'pass456', venueName: 'V2' });

  expect(res.status).toBe(409);
  expect(res.body.error).toBe('Email already registered');
});

// IT-03
test('IT-03: POST /api/auth/login with 2FA enabled and no TOTP returns requires2FA', async () => {
  const venue = await Venue.create({ name: 'V', qrCodeSecret: `s-${Date.now()}` });
  const secret = speakeasy.generateSecret();
  await Admin.create({
    email: '2fa@test.com',
    passwordHash: await bcrypt.hash('mypassword', 12),
    venueId: venue._id,
    twoFactorEnabled: true,
    twoFactorSecret: secret.base32,
  });

  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: '2fa@test.com', password: 'mypassword' });

  expect(res.status).toBe(200);
  expect(res.body).toMatchObject({ requires2FA: true });
});

// IT-04
test('IT-04: POST /api/auth/login with valid creds + valid TOTP returns JWT + venueId', async () => {
  const venue = await Venue.create({ name: 'V', qrCodeSecret: `s-${Date.now()}` });
  const secret = speakeasy.generateSecret();
  await Admin.create({
    email: 'valid@test.com',
    passwordHash: await bcrypt.hash('mypassword', 12),
    venueId: venue._id,
    twoFactorEnabled: true,
    twoFactorSecret: secret.base32,
  });

  const totp = speakeasy.totp({ secret: secret.base32, encoding: 'base32' });

  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'valid@test.com', password: 'mypassword', totpCode: totp });

  expect(res.status).toBe(200);
  expect(res.body.token).toBeDefined();
  expect(typeof res.body.token).toBe('string');
  expect(res.body.venueId).toBeDefined();
});

// IT-05
test('IT-05: POST /api/auth/login with wrong password returns 401', async () => {
  const venue = await Venue.create({ name: 'V', qrCodeSecret: `s-${Date.now()}` });
  await Admin.create({
    email: 'wrongpw@test.com',
    passwordHash: await bcrypt.hash('correct', 12),
    venueId: venue._id,
  });

  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'wrongpw@test.com', password: 'incorrect' });

  expect(res.status).toBe(401);
  expect(res.body.error).toBe('Invalid credentials');
});

// IT-06
test('IT-06: POST /api/auth/verify-2fa-setup with invalid setup token returns 401', async () => {
  const reg = await request(app)
    .post('/api/auth/register')
    .send({ email: 'setup@test.com', password: 'pass123', venueName: 'Setup Venue' });

  const code = speakeasy.totp({ secret: reg.body.secret, encoding: 'base32' });

  const res = await request(app)
    .post('/api/auth/verify-2fa-setup')
    .send({ setupToken: 'invalid-setup-token', token: code });

  expect(res.status).toBe(401);
  expect(res.body.error).toBe('Invalid or expired setup token');
});
