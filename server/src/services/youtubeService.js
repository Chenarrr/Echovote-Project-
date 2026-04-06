const axios = require('axios');
const { YOUTUBE_API_KEY } = require('../config/env');

const searchYouTube = async (query) => {
  const searchRes = await axios.get('https://www.googleapis.com/youtube/v3/search', {
    params: {
      part: 'snippet',
      q: query,
      type: 'video',
      videoCategoryId: '10',
      maxResults: 10,
      key: YOUTUBE_API_KEY,
    },
  });

  const items = searchRes.data.items;
  const videoIds = items.map((i) => i.id.videoId).join(',');

  const detailsRes = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
    params: {
      part: 'contentDetails',
      id: videoIds,
      key: YOUTUBE_API_KEY,
    },
  });

  const explicitSet = new Set(
    detailsRes.data.items
      .filter((v) => v.contentDetails?.contentRating?.ytRating === 'ytAgeRestricted')
      .map((v) => v.id)
  );

  return items.map((item) => ({
    youtubeId: item.id.videoId,
    title: item.snippet.title,
    thumbnail: item.snippet.thumbnails.medium.url,
    artist: item.snippet.channelTitle,
    isExplicit: explicitSet.has(item.id.videoId),
  }));
};

module.exports = { searchYouTube };
