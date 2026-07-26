import fs from "node:fs/promises";
import pdfParse from "pdf-parse/lib/pdf-parse.js";

/**
 * Extract text from a local PDF file path.
 * @param {string} filePath
 * @returns {Promise<{ text: string, pageCount: number }>}
 */
export async function extractPdfText(filePath) {
  const buffer = await fs.readFile(filePath);
  const data = await pdfParse(buffer);
  return {
    text: data.text || "",
    pageCount: data.numpages || 1,
  };
}
