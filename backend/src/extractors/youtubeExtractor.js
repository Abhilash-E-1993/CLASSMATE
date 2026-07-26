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
 * Falls back to video metadata extraction if YouTube blocks cloud IP automated scraping.
 * @param {string} youtubeUrl
 * @returns {Promise<{ title: string, videoId: string, url: string, items: Array<{ text: string, startTime: string, endTime: string, offsetSec: number }> }>}
 */
export async function extractYoutubeTranscript(youtubeUrl) {
  const videoId = extractYoutubeVideoId(youtubeUrl);
  if (!videoId) {
    throw new Error(`Invalid YouTube URL: ${youtubeUrl}`);
  }

  let rawItems = null;

  // Try fetching official transcript captions first
  try {
    rawItems = await YoutubeTranscript.fetchTranscript(videoId);
  } catch (transcriptErr) {
    console.warn(`[YouTube Extractor] Captions blocked/failed for ${videoId}:`, transcriptErr.message);
  }

  if (rawItems && rawItems.length > 0) {
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
  }

  // Fallback: Extract Video Title & Metadata if YouTube rate-limits automated transcript scraping on cloud IPs
  try {
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const resp = await fetch(videoUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    const html = await resp.text();

    const titleMatch =
      html.match(/<meta property="og:title" content="([^"]+)"/) ||
      html.match(/<title>([^<]+)<\/title>/);
    const descMatch = html.match(/<meta property="og:description" content="([^"]+)"/);

    const videoTitle = titleMatch
      ? titleMatch[1].replace("- YouTube", "").trim()
      : `YouTube Video (${videoId})`;
    const videoDesc = descMatch ? descMatch[1].trim() : `YouTube Video Content (${videoUrl})`;

    return {
      title: videoTitle,
      videoId,
      url: videoUrl,
      items: [
        {
          text: `[Video Title]: ${videoTitle}\n[Video Content & Summary]: ${videoDesc}`,
          startTime: "00:00",
          endTime: "01:00",
          offsetSec: 0,
        },
      ],
    };
  } catch (fallbackErr) {
    throw new Error(
      `YouTube transcript scraping was rate-limited by YouTube for cloud IPs. You can paste the transcript directly using the "VTT / Transcript" tab option!`
    );
  }
}
