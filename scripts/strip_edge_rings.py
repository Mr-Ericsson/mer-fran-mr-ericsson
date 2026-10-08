"""Strip remaining 1px black/white rings from icon edges."""
from pathlib import Path

import numpy as np
from PIL import Image

OUT = Path(r"C:\dev\Mer från Mr Ericsson") / "icons"
# Only touch previously rejected (leave approved as-is except optional light strip)
TARGETS = [
    "battleship",
    "trainstation",
    "familjespelen",
    "whomostlikely",
    "numbermatch",
    "padeltournaments",
    "korsmord",
    "numbermerge",
    "mrfitness",
]


def edge_is_ring(arr: np.ndarray, tol_black=40, tol_white=30) -> bool:
    ring = np.concatenate(
        [arr[0], arr[-1], arr[:, 0], arr[:, -1]],
        axis=0,
    ).astype(np.int16)
    mx = ring.max(axis=1)
    mn = ring.min(axis=1)
    blackish = (mx <= tol_black).mean()
    whiteish = (mn >= 255 - tol_white).mean()
    return blackish > 0.75 or whiteish > 0.75


def strip(im: Image.Image, max_steps: int = 24) -> Image.Image:
    im = im.convert("RGB")
    arr = np.asarray(im)
    for _ in range(max_steps):
        if min(arr.shape[:2]) < 64:
            break
        if not edge_is_ring(arr):
            break
        arr = arr[1:-1, 1:-1]
    # Always shave 2 more px — kills antialiased frame crumbs
    if min(arr.shape[:2]) > 80:
        arr = arr[2:-2, 2:-2]
    out = Image.fromarray(arr, "RGB")
    return out.resize((512, 512), Image.Resampling.LANCZOS)


def main() -> None:
    for name in TARGETS:
        path = OUT / f"{name}.png"
        with Image.open(path) as im:
            fixed = strip(im)
            fixed.save(path, "PNG", optimize=True)
            print("stripped", name)


if __name__ == "__main__":
    main()
