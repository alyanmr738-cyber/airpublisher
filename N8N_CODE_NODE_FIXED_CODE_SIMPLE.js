// Get file size from HTTP response headers
let videoSize = 0;
let binaryData = null;

// Try to get size from content-length header
const httpResponse = $input.first();
if (httpResponse && httpResponse.json && httpResponse.json.headers) {
  const contentLength = httpResponse.json.headers['content-length'];
  if (contentLength) {
    videoSize = parseInt(contentLength, 10) || 0;
  }
}

// Also try to access binary data (for passing it through)
if ($binary && $binary.data) {
  binaryData = $binary.data;
} else if ($input && $input.first() && $input.first().binary && $input.first().binary.data) {
  binaryData = $input.first().binary.data;
} else {
  // Reference the previous node by name (replace 'HTTP Request6' with your actual node name)
  const prevNode = $('HTTP Request6');
  if (prevNode && prevNode.item && prevNode.item.binary && prevNode.item.binary.data) {
    binaryData = prevNode.item.binary.data;
  }
}

const chunkSize = 10000000;
const totalChunkCount = videoSize > 0 ? Math.ceil(videoSize / chunkSize) : 1;

// Get video details from "Get a row4" node
// The output is an array, so we get the first item
const videoRow = $('Get a row4').item.json;
// If it's an array, get the first element; otherwise use it directly
const videoDetails = Array.isArray(videoRow) ? videoRow[0] : videoRow;

// Get tokens - you may need to adjust this based on your workflow
// Option 1: If you have a separate node for tokens, reference it here
// Option 2: If tokens are in the same row, they might be in a different field
// Option 3: Get tokens from a Supabase node
let tokens = {};
try {
  // Try to get from a separate token node (adjust node name as needed)
  const tokenNode = $('Get TikTok Tokens from Supabase');
  if (tokenNode && tokenNode.item && tokenNode.item.json) {
    tokens = tokenNode.item.json.platform_tokens || tokenNode.item.json || {};
  }
} catch (e) {
  // If no token node exists, you'll need to add one or get tokens another way
  console.log('No token node found - you may need to add a Supabase node to get tokens');
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
    access_token: tokens.access_token || '',
    open_id: tokens.open_id || tokens.tiktok_open_id || '',
    video_id: videoDetails.id,
    creator_unique_identifier: videoDetails.creator_unique_identifier
  },
  binary: binaryData ? {
    data: binaryData
  } : undefined
};


