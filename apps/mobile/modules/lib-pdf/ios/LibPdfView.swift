import ExpoModulesCore
import PDFKit

class LibPdfView: ExpoView {
  let onPageChange = EventDispatcher()
  private let pdfView = PDFView()
  private var sourceUrl: URL?
  private var requestedPageNumber: Int?

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    clipsToBounds = true
    pdfView.autoScales = true
    pdfView.displayDirection = .vertical
    pdfView.displayMode = .singlePageContinuous
    pdfView.displaysPageBreaks = true
    pdfView.pageBreakMargins = UIEdgeInsets(top: 10, left: 10, bottom: 10, right: 10)
    addSubview(pdfView)
    NotificationCenter.default.addObserver(
      self,
      selector: #selector(pageChanged),
      name: Notification.Name.PDFViewPageChanged,
      object: pdfView
    )
  }

  deinit {
    NotificationCenter.default.removeObserver(self)
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
    go(to: requestedPageNumber)
  }

  func go(to pageNumber: Int?) {
    requestedPageNumber = pageNumber
    guard
      let pageNumber,
      let document = pdfView.document,
      let page = document.page(at: max(0, min(pageNumber - 1, document.pageCount - 1)))
    else {
      return
    }
    pdfView.go(to: page)
  }

  func setDisplayMode(_ displayMode: String?) {
    pdfView.displayMode = displayMode == "singlePage" ? .singlePage : .singlePageContinuous
  }

  @objc private func pageChanged() {
    guard let document = pdfView.document, let page = pdfView.currentPage else {
      return
    }
    onPageChange(["pageNumber": document.index(for: page) + 1])
  }
}
