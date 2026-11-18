"""Encode opaque runtime textures. Source GLB images are preserved."""
import io
import sys
from PIL import Image

image = Image.open(io.BytesIO(sys.stdin.buffer.read())).convert("RGB")
size = int(sys.argv[1])
image.thumbnail((size, size), Image.Resampling.LANCZOS)
image.save(sys.stdout.buffer, "JPEG", quality=92, subsampling=0, optimize=True)
