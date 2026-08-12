import { requireNativeView } from "expo";

import type { WormPdfViewProps } from "./WormPdf.types";

const WormPdfView = requireNativeView<WormPdfViewProps>("WormPdf");

export default WormPdfView;
