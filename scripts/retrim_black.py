from pathlib import Path

import numpy as np
from PIL import Image

OUT = Path(r"C:\dev\Mer från Mr Ericsson") / "icons"


def trim_near_black(im: Image.Image, tol: int = 28) -> Image.Image:
    im = im.convert("RGBA")
    arr = np.asarray(im)
    rgb = arr[:, :, :3].astype(np.int16)
    a = arr[:, :, 3]
    near_black = rgb.max(axis=2) <= tol
    content = (a > 10) & (~near_black)
    if not content.any():
        return im
    ys, xs = np.where(content)
    pad = 2
    x0 = max(0, int(xs.min()) - pad)
    y0 = max(0, int(ys.min()) - pad)
    x1 = min(im.width, int(xs.max()) + 1 + pad)
    y1 = min(im.height, int(ys.max()) + 1 + pad)
    return im.crop((x0, y0, x1, y1))


def finalize(im: Image.Image, size: int = 512) -> Image.Image:
    im = trim_near_black(im)
    w, h = im.size
    side = max(w, h)
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(im, ((side - w) // 2, (side - h) // 2), im)
    canvas = canvas.resize((size, size), Image.Resampling.LANCZOS)
    arr = np.asarray(canvas)
    rgb = arr[:, :, :3].astype(np.int16)
    a = arr[:, :, 3]
    mask = (a > 200) & (rgb.max(axis=2) > 40)
    if mask.any():
        bg = tuple(int(x) for x in rgb[mask].mean(axis=0)) + (255,)
    else:
        bg = (18, 24, 36, 255)
    flat = Image.new("RGBA", canvas.size, bg)
    flat.paste(canvas, (0, 0), canvas)
    return flat.convert("RGB")


SOURCES = {
    "shikaku": Path(r"C:\dev\Shikaku\docs\assets\shikaku-play-icon-512.png"),
    "numbermerge": Path(r"C:\dev\Number Merge\assets\ic_launcher_512.png"),
    "whomostlikely": Path(
        r"C:\dev\Who Most Likely\app\src\main\res\mipmap-xxxhdpi\ic_launcher_foreground.png"
    ),
    "homeos": Path(r"C:\dev\HomeOS\homeos_adaptive_fg.png"),
    "padeltournaments": Path(
        r"C:\dev\Padelapp\android\app\src\main\res\mipmap-xxxhdpi\ic_launcher.webp"
    ),
    "mrfitness": Path(
        r"C:\dev\Training\fitness-app\android\app\src\main\res\mipmap-xxxhdpi\ic_launcher.png"
    ),
    "familjespelen": Path(
        r"C:\dev\Familjespelen\app\src\main\res\mipmap-xxxhdpi\ic_launcher.png"
    ),
}

for key, src in SOURCES.items():
    with Image.open(src) as raw:
        out = finalize(raw)
        dest = OUT / f"{key}.png"
        out.save(dest, "PNG", optimize=True)
        print("reOK", key, dest.stat().st_size)
