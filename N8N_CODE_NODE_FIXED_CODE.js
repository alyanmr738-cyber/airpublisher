// Get file size and binary data - try multiple methods
let videoSize = 0;
let binaryData = null;

// Method 1: Try $binary (direct binary input)
if ($binary && $binary.data) {
  binaryData = $binary.data;
  videoSize = binaryData.length || binaryData.byteLength || 0;
}

// Method 2: Try $input.first().binary
if (!binaryData && $input && $input.first()) {
  const firstInput = $input.first();
  if (firstInput.binary && firstInput.binary.data) {
    binaryData = firstInput.binary.data;
    videoSize = binaryData.length || binaryData.byteLength || 0;
  }
}

// Method 3: Try $input.all() and get first item's binary
if (!binaryData && $input) {
  const allItems = $input.all();
  if (allItems && allItems.length > 0 && allItems[0].binary && allItems[0].binary.data) {
    binaryData = allItems[0].binary.data;
    videoSize = binaryData.length || binaryData.byteLength || 0;
  }
}

// Method 4: Reference the download node directly by name
if (!binaryData) {
  try {
    const downloadNode = $('HTTP Request6');
    if (downloadNode) {
      // Try different ways to access the node's output
      const nodeOutput = downloadNode.item || downloadNode.first() || downloadNode;
      if (nodeOutput && nodeOutput.binary && nodeOutput.binary.data) {
        binaryData = nodeOutput.binary.data;
        videoSize = binaryData.length || binaryData.byteLength || 0;
      } else if (nodeOutput && nodeOutput.json && nodeOutput.json.binary && nodeOutput.json.binary.data) {
        binaryData = nodeOutput.json.binary.data;
        videoSize = binaryData.length || binaryData.byteLength || 0;
      }
    }
  } catch (e) {
    console.log('Could not access download node:', e.message);
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

// TikTok chunk size calculation
// For files under 20MB, use single chunk upload (recommended by TikTok)
// For larger files, use 10MB chunks
const MAX_SINGLE_CHUNK_SIZE = 20000000; // 20MB
let chunkSize;
let totalChunkCount;

if (videoSize <= MAX_SINGLE_CHUNK_SIZE) {
  // Single chunk upload - chunk size equals file size
  chunkSize = videoSize;
  totalChunkCount = 1;
} else {
  // Multi-chunk upload - use 10MB chunks
  chunkSize = 10000000; // 10MB
  totalChunkCount = Math.ceil(videoSize / chunkSize);
}

// Get video details from "Get a row4" node
// The output is an array, so we get the first item
const videoRow = $('Get a row4').item.json;
const videoDetails = Array.isArray(videoRow) ? videoRow[0] : videoRow;

// Get tokens from "Get a row5" node
// The output is an array, so we get the first item
let tokens = {};
try {
  const tokenRow = $('Get a row5').item.json;
  const tokenData = Array.isArray(tokenRow) ? tokenRow[0] : tokenRow;
  
  // Map TikTok token fields to the expected format
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
      privacy_level: "SELF_ONLY", // For unaudited apps, must use SELF_ONLY, FRIENDS_ONLY, or PRIVATE
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
  // CRITICAL: Pass binary through - use the exact format n8n expects
  binary: binaryData ? {
    data: binaryData,
    mimeType: 'video/mp4',
    fileName: 'video.mp4'
  } : (() => {
    // If we still don't have binary, try to get it from input one more time
    const input = $input.first();
    if (input && input.binary) {
      return input.binary; // Pass through as-is
    }
    return undefined;
  })()
};
