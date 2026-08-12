import type { NativeModule } from "expo";
import { requireOptionalNativeModule } from "expo";

interface WormPdfNativeModule extends NativeModule<Record<never, never>> {
  extractTextAsync(sourceUri: string): Promise<string[]>;
  getPageCountAsync(sourceUri: string): Promise<number>;
}

const nativeModule =
  requireOptionalNativeModule<WormPdfNativeModule>("WormPdf");

export const isWormPdfAvailable = nativeModule !== null;

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
