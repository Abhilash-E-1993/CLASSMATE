/**
 * Parse a WebVTT (.vtt) file content into structured cue items with timestamps.
 * @param {string} content
 * @returns {Array<{ text: string, startTime: string, endTime: string }>}
 */
export function parseVttContent(content) {
  if (!content) return [];

  const lines = content.split(/\r?\n/);
  const items = [];
  let currentStart = null;
  let currentEnd = null;
  let currentText = [];

  const timestampRegex = /((?:\d{2}:)?\d{2}:\d{2}[\.,]\d{3})\s*-->\s*((?:\d{2}:)?\d{2}:\d{2}[\.,]\d{3})/;

  for (let line of lines) {
    line = line.trim();
    if (!line || line === "WEBVTT" || line.startsWith("NOTE")) {
      if (currentStart && currentText.length > 0) {
        items.push({
          startTime: currentStart,
          endTime: currentEnd,
          text: currentText.join(" "),
        });
        currentStart = null;
        currentEnd = null;
        currentText = [];
      }
      continue;
    }

    const match = line.match(timestampRegex);
    if (match) {
      if (currentStart && currentText.length > 0) {
        items.push({
          startTime: currentStart,
          endTime: currentEnd,
          text: currentText.join(" "),
        });
        currentText = [];
      }
      // Format timestamps cleanly (drop milliseconds if desired or keep)
      currentStart = match[1].split(/[\.,]/)[0];
      currentEnd = match[2].split(/[\.,]/)[0];
      continue;
    }

    // Ignore cue identifier numbers like "1", "2"
    if (/^\d+$/.test(line) && !currentStart) {
      continue;
    }

    if (currentStart) {
      currentText.push(line);
    }
  }

  if (currentStart && currentText.length > 0) {
    items.push({
      startTime: currentStart,
      endTime: currentEnd,
      text: currentText.join(" "),
    });
  }

  return items;
}

/**
 * Extract transcript items from VTT or raw transcript string.
 * @param {string} rawContent
 * @returns {{ text: string, items: Array<{ text: string, startTime: string, endTime: string }> }}
 */
export function extractTranscript(rawContent) {
  if (rawContent.includes("WEBVTT") || rawContent.includes("-->")) {
    const items = parseVttContent(rawContent);
    const fullText = items.map((i) => `[${i.startTime}] ${i.text}`).join(" ");
    return { text: fullText || rawContent, items };
  }

  // Plain text fallback
  return { text: rawContent, items: [] };
}
