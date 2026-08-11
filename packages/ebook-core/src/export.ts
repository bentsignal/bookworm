import { PDFDocument } from "pdf-lib";

import type { BookSection } from "./model";
import { getIncludedPageIndexes } from "./model";

export async function buildPdfEdition(
  source: Uint8Array,
  sections: BookSection[],
) {
  const original = await PDFDocument.load(source);
  const pageIndexes = getIncludedPageIndexes(sections, original.getPageCount());
  if (pageIndexes.length === 0) {
    throw new Error("Include at least one page before exporting.");
  }
  const edition = await PDFDocument.create();
  const pages = await edition.copyPages(original, pageIndexes);
  for (const page of pages) edition.addPage(page);
  return edition.save();
}
