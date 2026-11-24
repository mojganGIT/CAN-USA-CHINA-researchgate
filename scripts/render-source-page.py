"""Render one complete publisher PDF page without editing its content or layout."""
import sys
import fitz


def render(source, page, destination):
    if fitz.VersionBind != "1.26.6":
        raise ValueError("Use the pinned PyMuPDF 1.26.6 renderer")
    with fitz.open(source) as document:
        if document.needs_pass or not 1 <= page <= document.page_count:
            raise ValueError("Official report page is unavailable")
        document[page - 1].get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False).save(destination)


if __name__ == "__main__":
    render(sys.argv[1], int(sys.argv[2]), sys.argv[3])
