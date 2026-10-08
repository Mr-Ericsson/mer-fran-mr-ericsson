"""Copy best source icons and trim white/black/transparent borders."""
from __future__ import annotations

import io
from pathlib import Path

from PIL import Image

ROOT = Path(r"C:\dev\Mer från Mr Ericsson")
OUT = ROOT / "icons"
OUT.mkdir(exist_ok=True)

# Prefer full play/store assets, then composited ic_launcher, then foreground.
SOURCES: dict[str, Path] = {
    "battleship": Path(
        r"C:\dev\Battleship\battleship_ericsson\ios\Runner\Assets.xcassets\AppIcon.appiconset\Icon-App-1024x1024@1x.png"
    ),
    "trainstation": Path(
        r"C:\dev\MrEricssonsTrainStation\app\src\main\res\drawable\ic_launcher_logo.png"
    ),
    "familjespelen": Path(
        r"C:\dev\Familjespelen\app\src\main\res\mipmap-xxxhdpi\ic_launcher.png"
    ),
    "whomostlikely": Path(
        r"C:\dev\Who Most Likely\app\src\main\res\mipmap-xxxhdpi\ic_launcher_foreground.png"
    ),
    "neverhaveiever": Path(
        r"C:\dev\Never Have I Ever\app\src\main\res\mipmap-xxxhdpi\ic_launcher.png"
    ),
    "numbermatch": Path(
        r"C:\dev\Numberpuzzle\android\app\src\main\res\drawable-xxxhdpi\ic_launcher_foreground.png"
    ),
    "homeos": Path(r"C:\dev\HomeOS\homeos_adaptive_fg.png"),
    "padeltournaments": Path(
        r"C:\dev\Padelapp\android\app\src\main\res\mipmap-xxxhdpi\ic_launcher.webp"
    ),
    "blockburst": Path(
        r"C:\dev\Block Burst\app\src\main\res\drawable-nodpi\ic_launcher_logo.png"
    ),
    "korsmord": Path(r"C:\dev\Korsmord\store\play_icon_512.png"),
    "sverigesdummaste": Path(
        r"C:\dev\Sveriges Dummaste Frågespel\assets\play_store\upload\app_icon_512.png"
    ),
    "numbermerge": Path(r"C:\dev\Number Merge\assets\ic_launcher_512.png"),
    "shikaku": Path(r"C:\dev\Shikaku\docs\assets\shikaku-play-icon-512.png"),
    "idledriver": Path(
        r"C:\dev\Idle driver\Idle driver\Assets\Art\App\app_icon_512.png"
    ),
    "mrfitness": Path(
        r"C:\dev\Training\fitness-app\android\app\src\main\res\mipmap-xxxhdpi\ic_launcher.png"
    ),
}


def near(c: tuple[int, int, int, int], target: tuple[int, int, int], tol: int) -> bool:
    return (
        abs(c[0] - target[0]) <= tol
        and abs(c[1] - target[1]) <= tol
        and abs(c[2] - target[2]) <= tol
    )


def edge_is_uniform(im: Image.Image, color: tuple[int, int, int], tol: int, alpha_max: int = 40) -> bool:
    w, h = im.size
    px = im.load()
    samples = []
    for x in range(w):
        samples.append(px[x, 0])
        samples.append(px[x, h - 1])
    for y in range(h):
        samples.append(px[0, y])
        samples.append(px[w - 1, y])
    match = 0
    for c in samples:
        if c[3] <= alpha_max or near(c, color, tol):
            match += 1
    return match / len(samples) >= 0.86


def trim_alpha(im: Image.Image) -> Image.Image:
    bbox = im.split()[-1].getbbox()
    return im.crop(bbox) if bbox else im


def trim_color_border(im: Image.Image, color: tuple[int, int, int], tol: int = 22) -> Image.Image:
    """Shrink while outer edge is mostly `color` (or transparent)."""
    im = im.convert("RGBA")
    guard = 0
    while guard < 400 and min(im.size) > 32:
        if not edge_is_uniform(im, color, tol):
            break
        im = im.crop((1, 1, im.width - 1, im.height - 1))
        guard += 1
    return im


def content_bbox_ignore_near_bg(im: Image.Image, tol: int = 16) -> tuple[int, int, int, int] | None:
    """BBox of pixels that are opaque and not near the median corner color."""
    im = im.convert("RGBA")
    w, h = im.size
    px = im.load()
    corners = [px[0, 0], px[w - 1, 0], px[0, h - 1], px[w - 1, h - 1]]
    # If corners disagree a lot, fall back to alpha trim only.
    def avg(cs):
        return tuple(sum(c[i] for c in cs) // len(cs) for i in range(3))

    bg = avg(corners)
    xs, ys = [], []
    for y in range(h):
        for x in range(w):
            c = px[x, y]
            if c[3] < 12:
                continue
            if near(c, bg, tol) and c[3] > 200:
                # treat solid bg-like as border only near edges later — count as non-content if very close to corner bg
                if abs(c[0] - bg[0]) + abs(c[1] - bg[1]) + abs(c[2] - bg[2]) <= tol:
                    continue
            xs.append(x)
            ys.append(y)
    if not xs:
        return im.getbbox()
    return min(xs), min(ys), max(xs) + 1, max(ys) + 1


def normalize(im: Image.Image, size: int = 512) -> Image.Image:
    im = im.convert("RGBA")
    im = trim_alpha(im)
    # Remove classic Play-style white / black frames
    im = trim_color_border(im, (255, 255, 255), tol=28)
    im = trim_color_border(im, (0, 0, 0), tol=28)
    im = trim_color_border(im, (10, 10, 12), tol=24)
    im = trim_alpha(im)

    # Extra: if a large uniform frame remains (slightly off-white), crop content bbox
    bbox = content_bbox_ignore_near_bg(im, tol=20)
    if bbox:
        bw = bbox[2] - bbox[0]
        bh = bbox[3] - bbox[1]
        if bw * bh < im.width * im.height * 0.92:
            # only crop if we gain meaningful area (frame present)
            if bw * bh > im.width * im.height * 0.35:
                im = im.crop(bbox)

    im = trim_alpha(im)

    # Cover square canvas (no letterboxing = no fake borders)
    w, h = im.size
    side = max(w, h)
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(im, ((side - w) // 2, (side - h) // 2), im)
    # Scale with cover into size — fill entire icon
    canvas = canvas.resize((size, size), Image.Resampling.LANCZOS)
    # Flatten onto dark-neutral? Better keep transparency and let CSS clip.
    # But transparent corners in rounded CSS look fine. If mostly transparent padding left, fill with sampled center.
    return canvas


def make_placeholder(title: str, accent: str, path: Path) -> None:
    from PIL import ImageDraw, ImageFont

    size = 512
    im = Image.new("RGBA", (size, size), (18, 24, 36, 255))
    draw = ImageDraw.Draw(im)
    # accent blob
    r, g, b = tuple(int(accent[i : i + 2], 16) for i in (1, 3, 5))
    draw.rounded_rectangle((48, 48, size - 48, size - 48), radius=96, fill=(r, g, b, 255))
    # initials
    words = [w for w in title.replace("-", " ").split() if w]
    initials = "".join(w[0] for w in words[:2]).upper() or "?"
    try:
        font = ImageFont.truetype("arial.ttf", 140)
    except OSError:
        font = ImageFont.load_default()
    bbox = draw.textbbox((0, 0), initials, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text(((size - tw) / 2, (size - th) / 2 - 10), initials, fill=(4, 12, 10, 255), font=font)
    im.save(path, "PNG")


def process_one(key: str, src: Path) -> None:
    dest = OUT / f"{key}.png"
    if not src.exists():
        print(f"MISSING source {key}: {src}")
        return
    with Image.open(src) as raw:
        out = normalize(raw)
        # Flatten: if >30% transparent, composite on sampled non-transparent color from center
        alpha = out.split()[-1]
        bbox = alpha.getbbox()
        if bbox:
            cropped = out.crop(bbox)
            # Cover again after crop
            out = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
            cropped = cropped.resize((512, 512), Image.Resampling.LANCZOS)
            out.paste(cropped, (0, 0), cropped)

        # Final flatten onto opaque — pick median of center 50% to avoid holes looking like borders
        px = list(out.crop((128, 128, 384, 384)).getdata())
        opaque = [p for p in px if p[3] > 200]
        if opaque:
            # average
            bg = tuple(sum(p[i] for p in opaque) // len(opaque) for i in range(3)) + (255,)
        else:
            bg = (18, 24, 36, 255)
        flat = Image.new("RGBA", out.size, bg)
        flat.paste(out, (0, 0), out)
        flat = flat.convert("RGB")
        flat.save(dest, "PNG", optimize=True)
        print(f"OK {key} <- {src.name} -> {dest.name} ({dest.stat().st_size})")


def main() -> None:
    for key, src in SOURCES.items():
        process_one(key, src)
    make_placeholder("Life Coach", "#3DDC97", OUT / "lifecoach.png")
    print("OK lifecoach placeholder")
    make_placeholder("Treasure Hunt", "#F0B429", OUT / "treasurehunt.png")
    print("OK treasurehunt placeholder")
    # remove old svg if present
    svg = OUT / "treasurehunt.svg"
    if svg.exists():
        svg.unlink()
        print("removed treasurehunt.svg")


if __name__ == "__main__":
    main()
