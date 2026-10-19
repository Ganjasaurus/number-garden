"""Package the static game with index.html at the archive root for itch.io."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

root = Path(__file__).resolve().parents[1]
output = root / "number-garden-web.zip"
with ZipFile(output, "w", ZIP_DEFLATED, compresslevel=9) as archive:
    for path in sorted((root / "dist").rglob("*")):
        if path.is_file():
            archive.write(path, path.relative_to(root / "dist"))
print(output)
