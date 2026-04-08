// Socket.IO reconnection tests.
//
// Simulates flaky wifi by disconnecting clients and verifying that:
//   (1) the client reconnects automatically,
//   (2) it can re-join its venue room after reconnect,
//   (3) it resumes receiving broadcasts on the re-joined room.

const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const { io: Client } = require('socket.io-client');

const { connect, close, clear } = require('../helpers/db');
const socketManager = require('../../src/services/socketManager');
const { registerHandlers } = require('../../src/socket/handlers');

let httpServer, io, port, app;

beforeAll(async () => {
  await connect();
  app = express();
  app.use(express.json());
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

const connectClient = (opts = {}) =>
  new Promise((resolve, reject) => {
    const client = Client(`http://localhost:${port}`, {
      transports: ['websocket'],
      forceNew: true,
      reconnection: true,
      reconnectionDelay: 50,
      reconnectionAttempts: 5,
      ...opts,
    });
    client.on('connect', () => resolve(client));
    client.on('connect_error', reject);
  });

const waitForEvent = (client, event, timeoutMs = 3000) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout waiting for "${event}"`)), timeoutMs);
    client.once(event, (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// SR-01
test('SR-01: client auto-reconnects after forced disconnect', async () => {
  const client = await connectClient();
  expect(client.connected).toBe(true);

  const reconnectPromise = new Promise((resolve) => client.once('connect', resolve));
  // Force a low-level disconnect that triggers auto-reconnect
  client.io.engine.close();

  await reconnectPromise;
  expect(client.connected).toBe(true);
  client.disconnect();
});

// SR-02
test('SR-02: room membership must be re-established after reconnect (server does not persist rooms)', async () => {
  const venueId = 'sr-venue-2';
  const client = await connectClient();
  client.emit('join_venue', { venueId });
  await delay(100);

  // Broadcast before disconnect should arrive
  const before = waitForEvent(client, 'probe_event');
  io.to(`venue:${venueId}`).emit('probe_event', { seq: 1 });
  await expect(before).resolves.toEqual({ seq: 1 });

  // Kill connection and wait for auto-reconnect
  const reconnected = new Promise((resolve) => client.once('connect', resolve));
  client.io.engine.close();
  await reconnected;

  // Post-reconnect: without re-joining, the client should NOT receive the
  // next broadcast (server-side rooms are per-socket-id, not persisted).
  let received = false;
  client.once('probe_event', () => { received = true; });
  io.to(`venue:${venueId}`).emit('probe_event', { seq: 2 });
  await delay(200);
  expect(received).toBe(false);

  // After explicit re-join, broadcasts flow again
  client.emit('join_venue', { venueId });
  await delay(100);
  const after = waitForEvent(client, 'probe_event');
  io.to(`venue:${venueId}`).emit('probe_event', { seq: 3 });
  await expect(after).resolves.toEqual({ seq: 3 });

  client.disconnect();
});

// SR-03
test('SR-03: after reconnect + re-join, a fresh queue_updated broadcast is received (resync pattern)', async () => {
  const venueId = 'sr-venue-3';
  const client = await connectClient();
  client.emit('join_venue', { venueId });
  await delay(100);

  // Disconnect + reconnect
  const reconnected = new Promise((resolve) => client.once('connect', resolve));
  client.io.engine.close();
  await reconnected;
  client.emit('join_venue', { venueId });
  await delay(100);

  // Server emits queue_updated (as if a song was just added) → client receives
  const p = waitForEvent(client, 'queue_updated');
  io.to(`venue:${venueId}`).emit('queue_updated', { queue: [{ songId: 'after-reconnect' }] });
  const data = await p;
  expect(data.queue[0].songId).toBe('after-reconnect');

  client.disconnect();
});
