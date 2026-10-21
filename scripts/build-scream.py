"""Rebuild the bundled deep scream from marc3122's CC0 human performance.
Requires ffmpeg. The built MP3 is shipped; this script never runs in the browser.
"""
from hashlib import sha256
from pathlib import Path
from tempfile import TemporaryDirectory
from urllib.request import urlopen
import subprocess

SOURCE = "https://cdn.freesound.org/previews/556/556976_12497831-hq.mp3"
SOURCE_SHA256 = "a7c4abd986ee308854ac33b6d5cad5f67d5d4c2b0eb36bd1a2231d3f93597dc4"
FILTER = (
    "[0:a]atrim=start=0.67:end=2.55,asetpts=PTS-STARTPTS,asplit=2[voice][body];"
    "[voice]asetrate=35280,aresample=48000,highpass=f=70,lowpass=f=6000,"
    "acompressor=threshold=0.13:ratio=3:attack=5:release=100,"
    "aecho=0.85:0.82:43|79:0.14|0.08,volume=1.15[lead];"
    "[body]asetrate=26460,aresample=48000,highpass=f=45,lowpass=f=850,volume=0.40[low];"
    "[lead][low]amix=inputs=2:normalize=0:duration=longest,volume=1.45,"
    "alimiter=limit=0.87:level=false,afade=t=in:d=0.003,"
    "afade=t=out:st=2.25:d=0.30,atrim=duration=2.55,aresample=32000[out]"
)

root = Path(__file__).resolve().parents[1]
with TemporaryDirectory(prefix="number-garden-audio-") as directory:
    with urlopen(SOURCE, timeout=30) as response:
        data = response.read()
    if sha256(data).hexdigest() != SOURCE_SHA256:
        raise RuntimeError("The upstream recording changed; review the source before rebuilding.")
    source = Path(directory) / "human-screams.mp3"
    source.write_bytes(data)
    subprocess.run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(source),
        "-filter_complex", FILTER, "-map", "[out]", "-ac", "1", "-c:a", "libmp3lame",
        "-b:a", "112k", "-map_metadata", "-1", str(root / "dist/assets/scream-deep.mp3")
    ], check=True)
print("Built dist/assets/scream-deep.mp3")
