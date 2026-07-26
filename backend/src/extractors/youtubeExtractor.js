import { YoutubeTranscript } from "youtube-transcript";

/**
 * Extract video ID from various YouTube URL formats.
 * @param {string} url
 * @returns {string|null}
 */
export function extractYoutubeVideoId(url) {
  if (!url) return null;
  const match = url.match(
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i
  );
  return match ? match[1] : null;
}

/**
 * Format milliseconds/seconds into HH:MM:SS format.
 * @param {number} seconds
 * @returns {string}
 */
export function formatTimestamp(seconds) {
  const sec = Math.floor(seconds);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) {
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

/**
 * Fetch YouTube transcript with start & end timestamps.
 * @param {string} youtubeUrl
 * @returns {Promise<{ title: string, videoId: string, url: string, items: Array<{ text: string, startTime: string, endTime: string, offsetSec: number }> }>}
 */
export async function extractYoutubeTranscript(youtubeUrl) {
  const videoId = extractYoutubeVideoId(youtubeUrl);
  if (!videoId) {
    throw new Error(`Invalid YouTube URL: ${youtubeUrl}`);
  }

  try {
    const rawItems = await YoutubeTranscript.fetchTranscript(videoId);
    if (!rawItems || rawItems.length === 0) {
      throw new Error(`No transcript available for YouTube video: ${videoId}`);
    }

    const items = rawItems.map((item) => {
      const offsetVal = Number(item.offset || 0);
      const startSec = offsetVal > 100000 ? Math.floor(offsetVal / 1000) : Math.floor(offsetVal);
      const durationVal = Number(item.duration || 2);
      const durationSec = durationVal > 10000 ? Math.floor(durationVal / 1000) : Math.floor(durationVal);
      const endSec = startSec + durationSec;
      return {
        text: item.text.replace(/\n/g, " ").trim(),
        startTime: formatTimestamp(startSec),
        endTime: formatTimestamp(endSec),
        offsetSec: startSec,
      };
    });

    return {
      title: `YouTube Video (${videoId})`,
      videoId,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      items,
    };
  } catch (err) {
    throw new Error(`Failed to fetch YouTube transcript: ${err.message}`);
  }
}
