"""Central validation for images accepted by administrative upload endpoints.

Malware scanning should be inserted after this validation and before Cloudinary or
local persistence when a scanner service is introduced.
"""
from pathlib import Path
from uuid import uuid4
from werkzeug.utils import secure_filename

ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
ALLOWED_IMAGE_MIMES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".webm", ".mov"}
ALLOWED_VIDEO_MIMES = {"video/mp4", "video/webm", "video/quicktime"}


def validate_image_upload(file_storage):
    if not file_storage or not file_storage.filename:
        return None, "No file selected."
    original = secure_filename(file_storage.filename)
    extension = Path(original).suffix.lower()
    if extension not in ALLOWED_IMAGE_EXTENSIONS:
        return None, "Unsupported image extension."
    if (file_storage.mimetype or "").lower() not in ALLOWED_IMAGE_MIMES:
        return None, "Unsupported image content type."

    header = file_storage.stream.read(16)
    file_storage.stream.seek(0)
    signatures = {
        ".jpg": (b"\xff\xd8\xff",), ".jpeg": (b"\xff\xd8\xff",),
        ".png": (b"\x89PNG\r\n\x1a\n",), ".gif": (b"GIF87a", b"GIF89a"),
        ".webp": (b"RIFF",),
    }
    if not any(header.startswith(sig) for sig in signatures[extension]):
        return None, "File content does not match its image type."
    if extension == ".webp" and header[8:12] != b"WEBP":
        return None, "File content does not match WebP."
    return f"{uuid4().hex}{extension}", None


def validate_video_upload(file_storage):
    if not file_storage or not file_storage.filename:
        return None, "No video file selected."
    original = secure_filename(file_storage.filename)
    extension = Path(original).suffix.lower()
    if extension not in ALLOWED_VIDEO_EXTENSIONS:
        return None, "Unsupported video extension. Use MP4, WebM, or MOV."
    if (file_storage.mimetype or "").lower() not in ALLOWED_VIDEO_MIMES:
        return None, "Unsupported video content type."

    header = file_storage.stream.read(16)
    file_storage.stream.seek(0)
    is_valid = (
        (extension in {".mp4", ".mov"} and len(header) >= 12 and header[4:8] == b"ftyp")
        or (extension == ".webm" and header.startswith(b"\x1aE\xdf\xa3"))
    )
    if not is_valid:
        return None, "File content does not match its video type."
    return f"{uuid4().hex}{extension}", None
