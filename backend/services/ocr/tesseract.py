import io
import logging
from typing import Optional

from services.ocr.base import OCRProvider, OCRExtractionError
from utils.retry import sync_retry

logger = logging.getLogger(__name__)

# Tesseract config — PSM 6: assume a single uniform block of text
TESSERACT_CONFIG = "--oem 3 --psm 6"


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
        images = convert_from_bytes(file_bytes, dpi=200)
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
