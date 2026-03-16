from abc import ABC, abstractmethod
from typing import Optional


class OCRProvider(ABC):
    """
    Abstract OCR provider interface.
    All provider implementations must inherit from this class.
    This decouples the extraction pipeline from any specific OCR vendor.
    """

    @abstractmethod
    def extract_text(self, file_bytes: bytes, mime_type: str) -> str:
        """
        Extract raw text from the given file bytes.

        Args:
            file_bytes: Raw bytes of the uploaded document.
            mime_type: MIME type, e.g. 'application/pdf', 'image/png'.

        Returns:
            Raw extracted text string.

        Raises:
            OCRExtractionError: If extraction fails after retries.
        """
        ...

    @abstractmethod
    def is_available(self) -> bool:
        """Return True if the underlying OCR engine/service is reachable."""
        ...


class OCRExtractionError(Exception):
    """Raised when OCR extraction fails or produces unusable output."""
    def __init__(self, message: str, provider: Optional[str] = None, recoverable: bool = True):
        super().__init__(message)
        self.provider = provider
        self.recoverable = recoverable
