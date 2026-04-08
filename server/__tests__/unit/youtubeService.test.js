jest.mock('axios');

const axios = require('axios');
const { searchYouTube } = require('../../src/services/youtubeService');

// UT-09
test('UT-09: searchYouTube returns mapped results with expected shape', async () => {
  axios.get.mockImplementation((url) => {
    if (url.includes('/search')) {
      return Promise.resolve({
        data: {
          items: [
            {
              id: { videoId: 'vid-abc' },
              snippet: {
                title: 'Test &amp; Song &#39;Live&#39;',
                channelTitle: 'Test &amp; Artist',
                thumbnails: { medium: { url: 'https://example.com/thumb.jpg' } },
              },
            },
          ],
        },
      });
    }
    if (url.includes('/videos')) {
      return Promise.resolve({
        data: {
          items: [
            {
              id: 'vid-abc',
              contentDetails: { contentRating: { ytRating: 'ytAgeRestricted' } },
            },
          ],
        },
      });
    }
  });

  const results = await searchYouTube('test query');

  expect(Array.isArray(results)).toBe(true);
  expect(results).toHaveLength(1);
  expect(results[0]).toMatchObject({
    youtubeId: 'vid-abc',
    title: "Test & Song 'Live'",
    thumbnail: 'https://example.com/thumb.jpg',
    artist: 'Test & Artist',
    isExplicit: true,
  });
});
