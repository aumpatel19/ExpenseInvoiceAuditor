from config import settings
from services.ocr.base import OCRProvider
from services.ocr.tesseract import TesseractOCRProvider


def get_ocr_provider() -> OCRProvider:
    """
    Return the configured OCR provider.
    Add new providers here as elif branches — no other code needs to change.
    """
    provider = settings.ocr_provider.lower()
    if provider == "tesseract":
        return TesseractOCRProvider()
    # Future: elif provider == "google_vision": return GoogleVisionOCRProvider()
    # Future: elif provider == "aws_textract": return TextractOCRProvider()
    else:
        raise ValueError(
            f"Unknown OCR provider: '{provider}'. "
            f"Set OCR_PROVIDER in .env to one of: tesseract"
        )
