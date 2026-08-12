import ExpoModulesCore
import PDFKit

class WormPdfView: ExpoView {
  private let pdfView = PDFView()
  private var sourceUrl: URL?

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    clipsToBounds = true
    pdfView.autoScales = true
    pdfView.displayDirection = .vertical
    pdfView.displayMode = .singlePageContinuous
    pdfView.displaysPageBreaks = true
    pdfView.pageBreakMargins = UIEdgeInsets(top: 10, left: 10, bottom: 10, right: 10)
    addSubview(pdfView)
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    pdfView.frame = bounds
  }

  func load(_ url: URL) {
    guard sourceUrl != url else {
      return
    }
    sourceUrl = url
    pdfView.document = PDFDocument(url: url)
  }
}
