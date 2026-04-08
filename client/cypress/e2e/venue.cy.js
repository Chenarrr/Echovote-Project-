// E2E: VenuePage guest flows.
// All backend HTTP calls are stubbed via cy.intercept — these tests
// exercise ONLY the React UI + client-side logic. Socket.IO events are
// not stubbed; the app degrades to REST polling / optimistic updates.

const API = 'http://localhost:3001';
const VENUE_ID = '65f000000000000000000001';
const SONG_A = '65f000000000000000000a01';
const SONG_B = '65f000000000000000000a02';

const venueFixture = {
  _id: VENUE_ID,
  name: 'The Test Lounge',
  settings: { explicitFilter: false },
};

const queueFixture = [
  {
    _id: 'q1',
    songId: { _id: SONG_A, youtubeId: 'yt-a', title: 'Song A', thumbnail: '' },
    voteCount: 3,
    voterFingerprints: [],
  },
  {
    _id: 'q2',
    songId: { _id: SONG_B, youtubeId: 'yt-b', title: 'Song B', thumbnail: '' },
    voteCount: 1,
    voterFingerprints: [],
  },
];

describe('E2E VenuePage', () => {
  beforeEach(() => {
    cy.intercept('GET', `${API}/api/venue/${VENUE_ID}`, venueFixture).as('getVenue');
    cy.intercept('GET', `${API}/api/songs/${VENUE_ID}`, queueFixture).as('getQueue');
    cy.intercept('GET', `${API}/api/playback/${VENUE_ID}`, {
      isPlaying: false,
      currentSongId: null,
      currentSong: null,
    }).as('getPlayback');
  });

  // E2E-01
  it('E2E-01: loads and shows venue name in header', () => {
    cy.visit(`/venue/${VENUE_ID}`);
    cy.wait('@getVenue');
    cy.contains('The Test Lounge').should('be.visible');
  });

  // E2E-02
  it('E2E-02: searching a song and adding it calls POST /api/songs', () => {
    cy.intercept('GET', `${API}/api/songs/search?q=*`, [
      { youtubeId: 'yt-new', title: 'New Track', thumbnail: '', isExplicit: false, channel: 'Ch' },
    ]).as('search');

    cy.intercept('POST', `${API}/api/songs/${VENUE_ID}`, {
      statusCode: 201,
      body: {
        song: { _id: 'new-song-id', youtubeId: 'yt-new', title: 'New Track' },
        queueEntry: { _id: 'new-q', songId: 'new-song-id', voteCount: 0 },
      },
    }).as('addSong');

    cy.visit(`/venue/${VENUE_ID}`);
    cy.wait('@getQueue');

    cy.get('input#song-search').type('new track');
    cy.get('input#song-search').closest('form').submit();
    cy.wait('@search');

    cy.contains('New Track').should('be.visible');
    cy.contains('button', '+ Add').click();
    cy.wait('@addSong').its('request.body.youtubeId').should('eq', 'yt-new');
  });

  // E2E-03
  it('E2E-03: voting on a song sends POST /api/votes/:songId', () => {
    cy.intercept('POST', `${API}/api/votes/${SONG_A}`, {
      statusCode: 200,
      body: { voteCount: 4 },
    }).as('vote');

    cy.visit(`/venue/${VENUE_ID}`);
    cy.wait('@getQueue');

    cy.contains('Song A')
      .parents('[class*="glass"]')
      .first()
      .find('button')
      .contains(/^3$|Vote/i)
      .click({ force: true });

    cy.wait('@vote');
  });

  // E2E-04
  it('E2E-04: undoing a vote sends DELETE /api/votes/:songId', () => {
    // First vote succeeds
    cy.intercept('POST', `${API}/api/votes/${SONG_A}`, {
      statusCode: 200,
      body: { voteCount: 4 },
    }).as('vote');
    cy.intercept('DELETE', `${API}/api/votes/${SONG_A}`, {
      statusCode: 200,
      body: { voteCount: 3 },
    }).as('unvote');

    cy.visit(`/venue/${VENUE_ID}`);
    cy.wait('@getQueue');

    cy.contains('Song A')
      .parents('[class*="glass"]')
      .first()
      .find('button')
      .first()
      .click({ force: true });
    cy.wait('@vote');

    cy.contains('Song A')
      .parents('[class*="glass"]')
      .first()
      .find('button')
      .first()
      .click({ force: true });
    cy.wait('@unvote');
  });

  // E2E-05
  it('E2E-05: adding a 3rd song shows error from server', () => {
    cy.intercept('GET', `${API}/api/songs/search?q=*`, [
      { youtubeId: 'yt-third', title: 'Third Track', thumbnail: '', isExplicit: false, channel: 'Ch' },
    ]).as('search');

    cy.intercept('POST', `${API}/api/songs/${VENUE_ID}`, {
      statusCode: 403,
      body: { error: 'You can only add up to 2 songs at a time' },
    }).as('addBlocked');

    // window.alert is called by SearchBar on error; stub it
    const alertStub = cy.stub().as('alert');
    cy.on('window:alert', alertStub);

    cy.visit(`/venue/${VENUE_ID}`);
    cy.wait('@getQueue');

    cy.get('input#song-search').type('third');
    cy.get('input#song-search').closest('form').submit();
    cy.wait('@search');

    cy.contains('button', '+ Add').click();
    cy.wait('@addBlocked');
    cy.get('@alert').should('have.been.calledWithMatch', /only add up to 2 songs/i);
  });
});
