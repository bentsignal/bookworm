import { requireNativeView } from "expo";

import type { LibPdfViewProps } from "./LibPdf.types";

const LibPdfView = requireNativeView<LibPdfViewProps>("LibPdf");

export default LibPdfView;
