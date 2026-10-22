"""Rebuild the demonic scream and groan from marc3122's CC0 human performance.
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
    "[0:a]asplit=3[voice][body][breath];"
    "[voice]atrim=start=0.67:end=2.55,asetpts=PTS-STARTPTS,"
    "asetrate=28224,aresample=48000,highpass=f=75,lowpass=f=5200,"
    "acompressor=threshold=0.10:ratio=4:attack=2:release=90,"
    "aecho=0.90:0.86:37|83:0.16|0.09,volume=1.7[lead];"
    "[body]atrim=start=0.67:end=2.05,asetpts=PTS-STARTPTS,"
    "asetrate=17640,aresample=48000,highpass=f=50,lowpass=f=1200,"
    "volume=2,asoftclip=type=tanh,volume=0.65[low];"
    "[breath]atrim=start=9.51:end=10.30,asetpts=PTS-STARTPTS,"
    "asetrate=24255,aresample=48000,highpass=f=65,lowpass=f=2200,"
    "acompressor=threshold=0.09:ratio=4:attack=3:release=90,"
    "volume=1.2,afade=t=in:d=0.025,adelay=1550:all=1[growl];"
    "[lead][low][growl]amix=inputs=3:normalize=0:duration=longest,volume=2.1,"
    "alimiter=limit=0.84:level=false:attack=2:release=70,"
    "afade=t=in:d=0.002,afade=t=out:st=2.95:d=0.25,"
    "atrim=duration=3.20,aresample=32000[out]"
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
        "-b:a", "112k", "-map_metadata", "-1", str(root / "dist/assets/scream-demonic.mp3")
    ], check=True)
print("Built dist/assets/scream-demonic.mp3")
