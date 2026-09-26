# Code Assist: screenshots and context files

ARCH Code Assist accepts pasted text plus up to six local attachments (1 MB each, 5 MB total):

- **Screenshots:** PNG, JPEG, WebP, GIF and BMP. The server extracts visible text with the local
  Tesseract executable (`eng`, page segmentation mode 3). OCR is offline: ARCH does not send image
  bytes to a vision vendor. Install it on the machine/container running ARCH:
  - macOS: `brew install tesseract`
  - Debian/Ubuntu: `sudo apt install tesseract-ocr`
  - Windows: install Tesseract OCR and make `tesseract.exe` available on `PATH`.
- **Text context:** Markdown, plain text/logs, common source files, config, SQL and diffs. The
  content and OCR result share a 20,000-character limit with the pasted snippet.

Select files in **Dashboard → Code Assist**. Images are validated by their file signatures, written
only to a private short-lived temporary directory for OCR, and removed immediately afterward. Text
files are decoded as UTF-8. Nothing is persisted; audit records contain only request metadata. When
`AI_PROVIDER=arch`, the extracted text is analyzed by ARCH's deterministic native analyzer. If a
local/hybrid model is configured, attachment secrets are scrubbed before the prompt is handed to it.

OCR is designed for readable terminal errors, stack traces and code screenshots, not chart / photo
understanding. Crop or enlarge small text when OCR misses it. ARCH rejects unknown/binary document
formats instead of attempting to execute or parse them.
