// E2E: AdminLogin + AdminDashboard flows.
// All backend calls stubbed via cy.intercept.

const API = 'http://localhost:3001';
const VENUE_ID = '65f000000000000000000001';

describe('E2E Admin flows', () => {
  // E2E-06
  it('E2E-06: registering shows 2FA QR code + manual entry secret', () => {
    cy.intercept('POST', `${API}/api/auth/register`, {
      statusCode: 201,
      body: {
        qrCode:
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Zx5z3oAAAAASUVORK5CYII=',
        secret: 'JBSWY3DPEHPK3PXP',
        setupRequired: true,
      },
    }).as('register');

    cy.visit('/admin/login');
    cy.contains('button', /register/i).click();

    cy.get('input[placeholder*="venue" i], input[autocomplete="organization"]').type('Test Venue');
    cy.get('input[type="email"]').type('admin@test.com');
    cy.get('input[type="password"]').type('pw123');
    cy.contains('button', /create venue/i).click();

    cy.wait('@register');
    cy.get('img[alt="2FA QR Code"]').should('be.visible');
    cy.contains('JBSWY3DPEHPK3PXP').should('be.visible');
  });

  // E2E-07
  it('E2E-07: dashboard Skip button calls POST /api/admin/skip', () => {
    // seed localStorage so AdminDashboard mounts past the auth guard
    window.localStorage.setItem('echovote_token', 'fake-jwt');
    window.localStorage.setItem('echovote_venueId', VENUE_ID);

    cy.intercept('GET', `${API}/api/admin/venue`, {
      _id: VENUE_ID,
      name: 'AdminVenue',
      image: null,
      settings: { explicitFilter: false },
    }).as('getAdminVenue');

    cy.intercept('GET', `${API}/api/songs/${VENUE_ID}`, []).as('getQueue');
    cy.intercept('GET', `${API}/api/playback/${VENUE_ID}`, {
      isPlaying: false,
      currentSongId: null,
      currentSong: null,
    }).as('getPlayback');

    cy.intercept('POST', `${API}/api/admin/skip`, {
      statusCode: 200,
      body: { success: true },
    }).as('skip');

    cy.visit('/admin/dashboard');
    cy.wait('@getAdminVenue');
    cy.contains('button', 'Skip').click();
    cy.wait('@skip');
  });

  // E2E-08
  it('E2E-08: explicit filter toggle calls POST /api/admin/filter and flips label', () => {
    window.localStorage.setItem('echovote_token', 'fake-jwt');
    window.localStorage.setItem('echovote_venueId', VENUE_ID);

    cy.intercept('GET', `${API}/api/admin/venue`, {
      _id: VENUE_ID,
      name: 'AdminVenue',
      image: null,
      settings: { explicitFilter: false },
    }).as('getAdminVenue');
    cy.intercept('GET', `${API}/api/songs/${VENUE_ID}`, []).as('getQueue');
    cy.intercept('GET', `${API}/api/playback/${VENUE_ID}`, {
      isPlaying: false,
      currentSongId: null,
      currentSong: null,
    }).as('getPlayback');

    cy.intercept('POST', `${API}/api/admin/filter`, {
      statusCode: 200,
      body: { explicitFilter: true },
    }).as('filter');

    cy.visit('/admin/dashboard');
    cy.wait('@getAdminVenue');

    cy.contains('button', /Explicit:\s*OFF/i).click();
    cy.wait('@filter');
    cy.contains(/Explicit:\s*ON/i).should('be.visible');
  });
});
