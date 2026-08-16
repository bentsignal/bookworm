import type { NativeModule } from "expo";
import { requireOptionalNativeModule } from "expo";

interface LibPdfNativeModule extends NativeModule<Record<never, never>> {
  extractTextAsync(sourceUri: string): Promise<string[]>;
  getPageCountAsync(sourceUri: string): Promise<number>;
  renderPageAsync(
    sourceUri: string,
    destinationUri: string,
    pageNumber: number,
  ): Promise<void>;
}

const nativeModule = requireOptionalNativeModule<LibPdfNativeModule>("LibPdf");

export const isLibPdfAvailable = nativeModule !== null;

export function extractPdfTextAsync(sourceUri: string) {
  if (!nativeModule) {
    throw new Error("PDF text extraction is not available on this platform.");
  }
  return nativeModule.extractTextAsync(sourceUri);
}

export function getPdfPageCountAsync(sourceUri: string) {
  if (!nativeModule) {
    throw new Error("PDF reading is not available on this platform.");
  }
  return nativeModule.getPageCountAsync(sourceUri);
}

export function renderPdfPageAsync(
  sourceUri: string,
  destinationUri: string,
  pageNumber = 1,
) {
  if (!nativeModule) {
    throw new Error("PDF rendering is not available on this platform.");
  }
  return nativeModule.renderPageAsync(sourceUri, destinationUri, pageNumber);
}
