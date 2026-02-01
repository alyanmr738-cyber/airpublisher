// Alternative: Single Chunk Upload for Files Under 20MB
// Use this if TikTok rejects the chunked upload

// Get file size - prioritize binary data size over header
let videoSize = 0;
let binaryData = null;

// First, try to get size from binary data (most accurate)
if ($binary && $binary.data) {
  binaryData = $binary.data;
  videoSize = binaryData.length || binaryData.byteLength || 0;
} else if ($input && $input.first() && $input.first().binary && $input.first().binary.data) {
  binaryData = $input.first().binary.data;
  videoSize = binaryData.length || binaryData.byteLength || 0;
} else {
  // Reference the previous node by name (replace 'HTTP Request6' with your actual node name)
  const prevNode = $('HTTP Request6');
  if (prevNode && prevNode.item && prevNode.item.binary && prevNode.item.binary.data) {
    binaryData = prevNode.item.binary.data;
    videoSize = binaryData.length || binaryData.byteLength || 0;
  }
}

// If we still don't have size from binary, try content-length header
if (videoSize === 0) {
  const httpResponse = $input.first();
  if (httpResponse && httpResponse.json && httpResponse.json.headers) {
    const contentLength = httpResponse.json.headers['content-length'];
    if (contentLength) {
      videoSize = parseInt(contentLength, 10) || 0;
    }
  }
}

// For files under 20MB, use single chunk upload
// For larger files, use 10MB chunks
const MAX_SINGLE_CHUNK_SIZE = 20000000; // 20MB
let chunkSize;
let totalChunkCount;

if (videoSize <= MAX_SINGLE_CHUNK_SIZE) {
  // Single chunk upload - use full file size as chunk size
  chunkSize = videoSize;
  totalChunkCount = 1;
} else {
  // Multi-chunk upload - use 10MB chunks
  chunkSize = 10000000; // 10MB
  totalChunkCount = Math.ceil(videoSize / chunkSize);
}

// Get video details from "Get a row4" node
const videoRow = $('Get a row4').item.json;
const videoDetails = Array.isArray(videoRow) ? videoRow[0] : videoRow;

// Get tokens from "Get a row5" node
let tokens = {};
try {
  const tokenRow = $('Get a row5').item.json;
  const tokenData = Array.isArray(tokenRow) ? tokenRow[0] : tokenRow;
  
  tokens = {
    access_token: tokenData.tiktok_access_token || '',
    open_id: tokenData.tiktok_open_id || '',
    tiktok_open_id: tokenData.tiktok_open_id || '',
    refresh_token: tokenData.tiktok_refresh_token || ''
  };
} catch (e) {
  console.log('Error getting tokens:', e);
}

return {
  json: {
    video_size: videoSize,
    chunk_size: chunkSize,
    total_chunk_count: totalChunkCount,
    post_info: {
      title: videoDetails.title || 'Untitled Video',
      privacy_level: "PUBLIC_TO_EVERYONE",
      disable_duet: false,
      disable_comment: false,
      disable_stitch: false,
      video_cover_timestamp_ms: 1000
    },
    source_info: {
      source: "FILE_UPLOAD",
      video_size: videoSize,
      chunk_size: chunkSize,
      total_chunk_count: totalChunkCount
    },
    access_token: tokens.access_token,
    open_id: tokens.open_id || tokens.tiktok_open_id,
    video_id: videoDetails.id,
    creator_unique_identifier: videoDetails.creator_unique_identifier
  },
  binary: binaryData ? {
    data: binaryData
  } : undefined
};


