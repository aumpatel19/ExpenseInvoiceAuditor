import io
import os
import sys
import logging
from typing import Optional

from services.ocr.base import OCRProvider, OCRExtractionError
from utils.retry import sync_retry

logger = logging.getLogger(__name__)

# Tesseract config — PSM 6: assume a single uniform block of text
TESSERACT_CONFIG = "--oem 3 --psm 6"

# ─── Auto-configure Tesseract binary path on Windows ─────────────────────────
def _configure_tesseract():
    """
    On Windows, Tesseract is typically installed at a known path but NOT added
    to PATH automatically. This function detects the binary and sets pytesseract's
    tesseract_cmd so OCR works without manual PATH configuration.
    """
    if sys.platform != "win32":
        return  # On Linux/Mac, 'tesseract' is typically on PATH already

    try:
        import pytesseract

        # If already works, nothing to do
        try:
            pytesseract.get_tesseract_version()
            logger.info("[OCR] Tesseract found on system PATH.")
            return
        except Exception:
            pass

        # Common Windows install locations
        candidate_paths = [
            r"C:\Program Files\Tesseract-OCR\tesseract.exe",
            r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
            r"C:\Users\{}\AppData\Local\Tesseract-OCR\tesseract.exe".format(os.environ.get("USERNAME", "")),
            r"C:\tools\Tesseract-OCR\tesseract.exe",
        ]

        for path in candidate_paths:
            if os.path.isfile(path):
                pytesseract.pytesseract.tesseract_cmd = path
                logger.info(f"[OCR] Tesseract binary found at: {path}")
                return

        logger.warning(
            "[OCR] Tesseract binary not found in common Windows paths. "
            "OCR will fail unless Tesseract is on your system PATH. "
            "Install from the bundled tesseract-installer.exe and ensure it is added to PATH."
        )
    except ImportError:
        logger.warning("[OCR] pytesseract not installed. Run: pip install pytesseract")


# Configure at module load time
_configure_tesseract()


class TesseractOCRProvider(OCRProvider):
    """
    Default OCR provider using pytesseract + pdf2image.
    Supports: PDF, PNG, JPG, JPEG
    """

    def is_available(self) -> bool:
        try:
            import pytesseract  # noqa
            pytesseract.get_tesseract_version()
            return True
        except Exception:
            return False

    @sync_retry(max_attempts=2, delay=0.5, exceptions=(Exception,))
    def extract_text(self, file_bytes: bytes, mime_type: str) -> str:
        try:
            if mime_type == "application/pdf":
                return self._extract_from_pdf(file_bytes)
            elif mime_type in ("image/png", "image/jpeg", "image/jpg"):
                return self._extract_from_image(file_bytes)
            else:
                raise OCRExtractionError(
                    f"Unsupported MIME type: {mime_type}",
                    provider="tesseract",
                    recoverable=False,
                )
        except OCRExtractionError:
            raise
        except Exception as e:
            raise OCRExtractionError(
                f"Tesseract extraction failed: {e}",
                provider="tesseract",
                recoverable=True,
            )

    def _extract_from_image(self, file_bytes: bytes) -> str:
        from PIL import Image
        import pytesseract
        image = Image.open(io.BytesIO(file_bytes))
        text = pytesseract.image_to_string(image, config=TESSERACT_CONFIG)
        if not text.strip():
            raise OCRExtractionError(
                "Tesseract returned empty text from image.",
                provider="tesseract",
                recoverable=True,
            )
        logger.info(f"[OCR] Extracted {len(text)} chars from image.")
        return text

    def _extract_from_pdf(self, file_bytes: bytes) -> str:
        import pytesseract
        try:
            from pdf2image import convert_from_bytes
        except ImportError:
            raise OCRExtractionError(
                "pdf2image not installed. Run: pip install pdf2image",
                provider="tesseract",
                recoverable=False,
            )

        try:
            images = convert_from_bytes(file_bytes, dpi=200)
        except Exception as e:
            err_str = str(e).lower()
            # Detect common Poppler-missing error on Windows
            if "poppler" in err_str or "pdftoppm" in err_str or "pdfinfo" in err_str or "unable to get page count" in err_str:
                raise OCRExtractionError(
                    "Poppler is not installed or not on PATH. "
                    "PDF to image conversion requires Poppler binaries. "
                    "Windows: Download from https://github.com/oschwartz10612/poppler-windows/releases "
                    "and add the 'Library/bin' folder to your system PATH.",
                    provider="tesseract",
                    recoverable=False,
                )
            raise OCRExtractionError(
                f"PDF conversion failed: {e}",
                provider="tesseract",
                recoverable=True,
            )

        all_text = []
        for i, img in enumerate(images):
            page_text = pytesseract.image_to_string(img, config=TESSERACT_CONFIG)
            all_text.append(page_text)
            logger.info(f"[OCR] PDF page {i+1}: extracted {len(page_text)} chars.")
        full_text = "\n".join(all_text).strip()
        if not full_text:
            raise OCRExtractionError(
                "Tesseract returned empty text from PDF.",
                provider="tesseract",
                recoverable=True,
            )
        return full_text
