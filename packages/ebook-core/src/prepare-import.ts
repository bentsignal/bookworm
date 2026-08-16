import JSZip from "jszip";

import { analyzeBook, analyzeEpubArchive } from "./analyze";
import { extractEpubCoverFromArchive } from "./epub-cover";
import { getBookFormat } from "./model";

export async function prepareBookImport(bytes: Uint8Array, fileName: string) {
  const format = getBookFormat(fileName);
  if (!format) throw new Error("lib supports EPUB and PDF files.");
  if (format === "pdf") {
    return { analysis: await analyzeBook(bytes, fileName) };
  }
  const archive = await JSZip.loadAsync(bytes);
  const [analysis, cover] = await Promise.all([
    analyzeEpubArchive(archive, fileName),
    extractEpubCoverFromArchive(archive),
  ]);
  return { analysis, cover };
}
