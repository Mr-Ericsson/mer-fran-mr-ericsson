"""Make rejected icons full-bleed like NHIE — cut squircle frames / letterbox."""
from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image

OUT = Path(r"C:\dev\Mer från Mr Ericsson") / "icons"
SIZE = 512

# Extra inset after content-detect (fraction of side) — kills Play/iOS border rings.
INSET = {
    "battleship": 0.10,
    "trainstation": 0.04,
    "familjespelen": 0.14,  # zoom past outer wood + frame
    "whomostlikely": 0.12,  # zoom past purple outer frame
    "numbermatch": 0.06,
    "padeltournaments": 0.10,
    "korsmord": 0.11,
    "numbermerge": 0.08,
    "mrfitness": 0.06,
}

SOURCES = {
    "battleship": Path(
        r"C:\dev\Battleship\battleship_ericsson\ios\Runner\Assets.xcassets\AppIcon.appiconset\Icon-App-1024x1024@1x.png"
    ),
    "trainstation": Path(r"C:\dev\MrEricssonsTrainStation\AppIcon.png"),
    "familjespelen": Path(
        r"C:\dev\Familjespelen\app\src\main\res\mipmap-xxxhdpi\ic_launcher_foreground.png"
    ),
    "whomostlikely": Path(
        r"C:\dev\Who Most Likely\app\src\main\res\mipmap-xxxhdpi\ic_launcher_foreground.png"
    ),
    "numbermatch": Path(r"C:\dev\Numberpuzzle\assets\images\logo.png"),
    "padeltournaments": Path(
        r"C:\dev\Padelapp\android\app\src\main\res\mipmap-xxxhdpi\ic_launcher_foreground.webp"
    ),
    "korsmord": Path(r"C:\dev\Korsmord\store\play_icon_512.png"),
    "numbermerge": Path(r"C:\dev\Number Merge\assets\ic_launcher_512.png"),
    "mrfitness": Path(r"C:\dev\Training\fitness-app\assets\icon.png"),
}


def alpha_bbox(im: Image.Image, thr: int = 20) -> tuple[int, int, int, int]:
    a = np.asarray(im.convert("RGBA"))[:, :, 3]
    ys, xs = np.where(a > thr)
    if len(xs) == 0:
        w, h = im.size
        return 0, 0, w, h
    return int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1


def non_corner_bbox(im: Image.Image, tol: int = 30) -> tuple[int, int, int, int]:
    """Ignore near-white / near-black / transparent padding common on store icons."""
    arr = np.asarray(im.convert("RGBA"))
    rgb = arr[:, :, :3].astype(np.int16)
    a = arr[:, :, 3]
    mx = rgb.max(axis=2)
    mn = rgb.min(axis=2)
    near_white = (mn >= 255 - tol) & (a > 10)
    near_black = (mx <= tol) & (a > 10)
    content = (a > 20) & (~near_white) & (~near_black)
    # If almost everything is "content", fall back to alpha only
    if content.mean() < 0.05:
        return alpha_bbox(im)
    ys, xs = np.where(content)
    return int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1


def cover(im: Image.Image, size: int = SIZE) -> Image.Image:
    im = im.convert("RGB")
    w, h = im.size
    scale = max(size / w, size / h)
    nw, nh = max(1, int(round(w * scale))), max(1, int(round(h * scale)))
    im = im.resize((nw, nh), Image.Resampling.LANCZOS)
    left = (nw - size) // 2
    top = (nh - size) // 2
    return im.crop((left, top, left + size, top + size))


def process(key: str, src: Path) -> Image.Image:
    with Image.open(src) as raw:
        im = raw.convert("RGBA")

    # 1) drop transparent / white-black letterbox
    x0, y0, x1, y1 = non_corner_bbox(im)
    im = im.crop((x0, y0, x1, y1))

    # 2) also tighten on alpha (iOS squircle)
    x0, y0, x1, y1 = alpha_bbox(im)
    im = im.crop((x0, y0, x1, y1))

    # 3) inset to cut baked border rings / rounded frame
    inset_frac = INSET.get(key, 0.08)
    w, h = im.size
    inset = int(min(w, h) * inset_frac)
    if inset * 2 < min(w, h) - 8:
        im = im.crop((inset, inset, w - inset, h - inset))

    # Flatten onto sampled center color (no transparent corners)
    rgb = im.convert("RGBA")
    arr = np.asarray(rgb)
    opaque = arr[:, :, 3] > 200
    if opaque.any():
        bg = tuple(int(x) for x in arr[:, :, :3][opaque].mean(axis=0))
    else:
        bg = (20, 24, 32)
    flat = Image.new("RGB", im.size, bg)
    flat.paste(im.convert("RGB"), mask=im.split()[-1])

    return cover(flat)


def make_placeholder(title: str, accent: str, path: Path) -> None:
    from PIL import ImageDraw, ImageFont

    r, g, b = tuple(int(accent[i : i + 2], 16) for i in (1, 3, 5))
    im = Image.new("RGB", (SIZE, SIZE), (r, g, b))
    draw = ImageDraw.Draw(im)
    initials = "".join(w[0] for w in title.split()[:2]).upper()
    try:
        font = ImageFont.truetype("arialbd.ttf", 170)
    except OSError:
        font = ImageFont.load_default()
    bbox = draw.textbbox((0, 0), initials, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text(((SIZE - tw) / 2, (SIZE - th) / 2 - 10), initials, fill=(10, 14, 18), font=font)
    im.save(path, "PNG", optimize=True)


def main() -> None:
    for key, src in SOURCES.items():
        if not src.exists():
            print("MISSING", key, src)
            continue
        out = process(key, src)
        dest = OUT / f"{key}.png"
        out.save(dest, "PNG", optimize=True)
        print(f"FIXED {key} ({dest.stat().st_size})")

    make_placeholder("Life Coach", "#3DDC97", OUT / "lifecoach.png")
    make_placeholder("Treasure Hunt", "#F0B429", OUT / "treasurehunt.png")
    print("placeholders ok")


if __name__ == "__main__":
    main()
