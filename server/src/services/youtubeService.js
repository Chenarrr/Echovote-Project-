const axios = require('axios');
const { YOUTUBE_API_KEY } = require('../config/env');

const searchYouTube = async (query) => {
  const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
    params: {
      part: 'snippet',
      q: query,
      type: 'video',
      videoCategoryId: '10',
      maxResults: 10,
      key: YOUTUBE_API_KEY,
    },
  });

  return response.data.items.map((item) => ({
    youtubeId: item.id.videoId,
    title: item.snippet.title,
    thumbnail: item.snippet.thumbnails.medium.url,
    artist: item.snippet.channelTitle,
  }));
};

module.exports = { searchYouTube };
