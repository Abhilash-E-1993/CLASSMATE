import axios from "axios";
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";

/**
 * Extract clean article content from a web URL.
 * Strips navigation, headers, footers, ads, and scripts.
 * @param {string} url
 * @returns {Promise<{ title: string, text: string, url: string }>}
 */
export async function extractWebPage(url) {
  try {
    const response = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 NotebookLM-Clone/1.0",
      },
      timeout: 15000,
    });

    const dom = new JSDOM(response.data, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article || !article.textContent.trim()) {
      // Fallback if Readability fails: grab body text
      const bodyText = dom.window.document.body?.textContent?.replace(/\s+/g, " ").trim() || "";
      const title = dom.window.document.title || url;
      return { title, text: bodyText, url };
    }

    return {
      title: article.title || dom.window.document.title || url,
      text: article.textContent.replace(/\s+/g, " ").trim(),
      url,
    };
  } catch (err) {
    throw new Error(`Failed to extract web page content from ${url}: ${err.message}`);
  }
}
