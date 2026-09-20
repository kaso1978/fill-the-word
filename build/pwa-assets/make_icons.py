"""Generates the PWA icon set from the app's head/brain/book mark.

Unlike the earlier flame mark (pure vector math, nothing to check in), this
mark started as a raster image, so `mark-source.png` — the mark alone,
background keyed out to transparency, cropped tight — IS committed as the
one source of truth. Everything this file produces (the actual sized PNGs
and the favicon) stays derived and gitignored, regenerated automatically by
build_pwa.py. Run standalone for a quick look:
python build/pwa-assets/make_icons.py
"""
from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).parent
SOURCE = OUT / "mark-source.png"
ORANGE = (242, 138, 0, 255)      # --orange


def _rounded_bg(size, radius_pct):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    r = int(size * radius_pct)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=r, fill=ORANGE)
    return img


def draw_mark(size, bg_radius_pct, pad_pct):
    """bg_radius_pct: corner radius as % of size. pad_pct: mark inset as % of size (for maskable safe zone).
    The source mark isn't square (a head-profile silhouette, taller than wide), so it's scaled to fit
    inside the padded content box by its longer side and centered, rather than stretched to fill it."""
    img = _rounded_bg(size, bg_radius_pct)
    mark = Image.open(SOURCE).convert("RGBA")

    pad = size * pad_pct
    box = size - 2 * pad
    scale = box / max(mark.width, mark.height)
    mark = mark.resize((max(1, round(mark.width * scale)), max(1, round(mark.height * scale))), Image.LANCZOS)

    x = round((size - mark.width) / 2)
    y = round((size - mark.height) / 2)
    img.alpha_composite(mark, (x, y))
    return img


def generate(out_dir=OUT):
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    # Standard icons: mark fills most of the tile, square corners (the OS/launcher does its own masking).
    for size in (192, 512):
        draw_mark(size, bg_radius_pct=0.22, pad_pct=0.14).save(out_dir / f"icon-{size}.png")

    # Maskable: content must stay inside the middle ~80% safe zone, background fills the full tile edge-to-edge.
    for size in (192, 512):
        draw_mark(size, bg_radius_pct=0.0, pad_pct=0.22).save(out_dir / f"icon-{size}-maskable.png")

    # Apple touch icon: no transparency, no OS-applied corner radius (iOS rounds it itself), slightly less inset.
    apple = draw_mark(180, bg_radius_pct=0.0, pad_pct=0.12).convert("RGB")
    apple.save(out_dir / "apple-touch-icon.png")

    # Favicon: multi-size ICO for browser tabs. Least inset of all — the mark's fine detail (the brain's
    # folds) needs every pixel it can get at 16px, more than the standard icon's padding would leave it.
    sizes = [16, 32, 48]
    favicon_frames = [draw_mark(s, bg_radius_pct=0.22, pad_pct=0.08) for s in sizes]
    favicon_frames[-1].save(out_dir / "favicon.ico", sizes=[(s, s) for s in sizes])
    return out_dir


if __name__ == "__main__":
    out = generate()
    print("wrote:", sorted(p.name for p in out.glob("*.png")), "favicon.ico")
