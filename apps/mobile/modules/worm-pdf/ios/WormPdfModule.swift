import ExpoModulesCore
import PDFKit

public class WormPdfModule: Module {
  public func definition() -> ModuleDefinition {
    Name("WormPdf")

    AsyncFunction("extractTextAsync") { (sourceUrl: URL) in
      let document = try openPdf(sourceUrl)
      return (0..<document.pageCount).map { pageIndex in
        document.page(at: pageIndex)?.string ?? ""
      }
    }

    AsyncFunction("getPageCountAsync") { (sourceUrl: URL) in
      try openPdf(sourceUrl).pageCount
    }

    View(WormPdfView.self) {
      Prop("sourceUri") { (view, sourceUrl: URL) in
        view.load(sourceUrl)
      }
    }
  }
}

private func openPdf(_ sourceUrl: URL) throws -> PDFDocument {
  guard let document = PDFDocument(url: sourceUrl), document.pageCount > 0 else {
    throw PdfOpenException()
  }
  guard !document.isLocked else {
    throw PdfLockedException()
  }
  return document
}

private final class PdfOpenException: Exception, @unchecked Sendable {
  override var reason: String {
    "Worm could not open this PDF."
  }
}

private final class PdfLockedException: Exception, @unchecked Sendable {
  override var reason: String {
    "This PDF is password-protected and cannot be opened yet."
  }
}
