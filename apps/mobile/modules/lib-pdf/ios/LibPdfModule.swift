import ExpoModulesCore
import PDFKit

public class LibPdfModule: Module {
  public func definition() -> ModuleDefinition {
    Name("LibPdf")

    AsyncFunction("extractTextAsync") { (sourceUrl: URL) in
      let document = try openPdf(sourceUrl)
      return (0..<document.pageCount).map { pageIndex in
        document.page(at: pageIndex)?.string ?? ""
      }
    }

    AsyncFunction("getPageCountAsync") { (sourceUrl: URL) in
      try openPdf(sourceUrl).pageCount
    }

    AsyncFunction("renderPageAsync") { (sourceUrl: URL, destinationUrl: URL, pageNumber: Int) in
      let document = try openPdf(sourceUrl)
      let index = max(0, min(pageNumber - 1, document.pageCount - 1))
      guard let page = document.page(at: index) else {
        throw PdfPageException()
      }
      let bounds = page.bounds(for: .mediaBox)
      let width: CGFloat = 1200
      let height = max(1, width * bounds.height / max(bounds.width, 1))
      let image = page.thumbnail(of: CGSize(width: width, height: height), for: .mediaBox)
      guard let data = image.jpegData(compressionQuality: 0.88) else {
        throw PdfPageException()
      }
      try data.write(to: destinationUrl, options: .atomic)
    }

    View(LibPdfView.self) {
      Events("onPageChange")

      Prop("sourceUri") { (view, sourceUrl: URL) in
        view.load(sourceUrl)
      }

      Prop("pageNumber") { (view, pageNumber: Int?) in
        view.go(to: pageNumber)
      }

      Prop("displayMode") { (view, displayMode: String?) in
        view.setDisplayMode(displayMode)
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
    "lib could not open this PDF."
  }
}

private final class PdfLockedException: Exception, @unchecked Sendable {
  override var reason: String {
    "This PDF is password-protected and cannot be opened yet."
  }
}

private final class PdfPageException: Exception, @unchecked Sendable {
  override var reason: String {
    "lib could not render this PDF page."
  }
}
