// NOTE: No jest.mock calls here — WebSocket tests use the REAL socketManager,
// REAL Socket.IO server, and REAL handlers.

const http = require('http');
const express = require('express');
const request = require('supertest');
const { Server } = require('socket.io');
const { io: Client } = require('socket.io-client');

const { connect, close, clear } = require('../helpers/db');
const socketManager = require('../../src/services/socketManager');
const { registerHandlers } = require('../../src/socket/handlers');

const Venue = require('../../src/models/Venue');
const Song = require('../../src/models/Song');
const ActiveQueue = require('../../src/models/ActiveQueue');

let httpServer, io, port, app;

beforeAll(async () => {
  await connect();

  app = express();
  app.use(express.json());
  // Only mount songs route for WS-03 (needs POST /api/songs/:venueId)
  app.use('/api/songs', require('../../src/routes/songs'));

  httpServer = http.createServer(app);
  io = new Server(httpServer);
  socketManager.init(io);
  registerHandlers(io);

  await new Promise((resolve) => httpServer.listen(0, resolve));
  port = httpServer.address().port;
});

afterAll(async () => {
  io.close();
  await new Promise((resolve) => httpServer.close(resolve));
  await close();
});

beforeEach(async () => await clear());

const connectClient = () => {
  return new Promise((resolve, reject) => {
    const client = Client(`http://localhost:${port}`, {
      transports: ['websocket'],
      forceNew: true,
      reconnection: false,
    });
    client.on('connect', () => resolve(client));
    client.on('connect_error', reject);
  });
};

const waitForEvent = (client, event, timeoutMs = 3000) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout waiting for "${event}"`)), timeoutMs);
    client.once(event, (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// WS-01
test('WS-01: client joining venue room receives subsequent broadcasts', async () => {
  const venueId = 'ws-venue-01';
  const client = await connectClient();
  client.emit('join_venue', { venueId });
  await delay(100); // allow server to process join

  const received = waitForEvent(client, 'custom_test_event');
  io.to(`venue:${venueId}`).emit('custom_test_event', { hello: 'world' });

  await expect(received).resolves.toEqual({ hello: 'world' });
  client.disconnect();
});

// WS-02
test('WS-02: cast_vote from client A emits update_tally to client B in same venue', async () => {
  const venue = await Venue.create({ name: 'WS2', qrCodeSecret: `s-${Date.now()}` });
  const song = await Song.create({ youtubeId: 'ws2-yt', title: 'WS2', venueId: venue._id });
  await ActiveQueue.create({ songId: song._id, venueId: venue._id });

  const venueIdStr = venue._id.toString();
  const songIdStr = song._id.toString();

  const clientA = await connectClient();
  const clientB = await connectClient();

  clientB.emit('join_venue', { venueId: venueIdStr });
  await delay(100);

  const tallyPromise = waitForEvent(clientB, 'update_tally');
  clientA.emit('cast_vote', {
    songId: songIdStr,
    fingerprint: 'ws2-fp',
    venueId: venueIdStr,
  });

  const tally = await tallyPromise;
  expect(tally.newCount).toBe(1);
  expect(String(tally.songId)).toBe(songIdStr);

  clientA.disconnect();
  clientB.disconnect();
});

// WS-03
test('WS-03: adding a song via API emits queue_updated to all venue clients', async () => {
  const venue = await Venue.create({ name: 'WS3', qrCodeSecret: `s-${Date.now()}` });
  const venueIdStr = venue._id.toString();

  const clientA = await connectClient();
  const clientB = await connectClient();

  clientA.emit('join_venue', { venueId: venueIdStr });
  clientB.emit('join_venue', { venueId: venueIdStr });
  await delay(100);

  const pA = waitForEvent(clientA, 'queue_updated');
  const pB = waitForEvent(clientB, 'queue_updated');

  await request(httpServer)
    .post(`/api/songs/${venueIdStr}`)
    .send({ youtubeId: 'ws3-yt', title: 'WS3 Song', addedBy: 'ws3-fp' });

  const [evA, evB] = await Promise.all([pA, pB]);
  expect(Array.isArray(evA.queue)).toBe(true);
  expect(Array.isArray(evB.queue)).toBe(true);
  expect(evA.queue.length).toBe(1);
  expect(evB.queue.length).toBe(1);

  clientA.disconnect();
  clientB.disconnect();
});

// WS-04
test('WS-04: progress_update from admin emits playback_progress to other venue clients', async () => {
  const venueId = 'ws-venue-04';

  const clientAdmin = await connectClient();
  const clientGuest = await connectClient();

  clientGuest.emit('join_venue', { venueId });
  clientAdmin.emit('join_venue', { venueId });
  await delay(100);

  const progressPromise = waitForEvent(clientGuest, 'playback_progress');
  clientAdmin.emit('progress_update', { venueId, currentTime: 42, duration: 180 });

  const received = await progressPromise;
  expect(received).toEqual({ currentTime: 42, duration: 180 });

  clientAdmin.disconnect();
  clientGuest.disconnect();
});

// WS-05
test('WS-05: song_reaction broadcast reaches all clients in venue room', async () => {
  const venueId = 'ws-venue-05';

  const clientA = await connectClient();
  const clientB = await connectClient();

  clientA.emit('join_venue', { venueId });
  clientB.emit('join_venue', { venueId });
  await delay(100);

  const pA = waitForEvent(clientA, 'reaction_update');
  const pB = waitForEvent(clientB, 'reaction_update');

  clientA.emit('song_reaction', { venueId, reaction: 'fire', fingerprint: 'ws5-fp' });

  const [rA, rB] = await Promise.all([pA, pB]);
  expect(rA).toEqual({ reaction: 'fire', fingerprint: 'ws5-fp' });
  expect(rB).toEqual({ reaction: 'fire', fingerprint: 'ws5-fp' });

  clientA.disconnect();
  clientB.disconnect();
});
