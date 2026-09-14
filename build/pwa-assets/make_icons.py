"""Generates the PWA icon set from the app's own flame mark.

Regenerated automatically by build_pwa.py (not committed — deterministic,
cheap, and this way there's one source of truth instead of a checked-in copy
that can drift from the code that makes it). Run standalone for a quick look:
python build/pwa-assets/make_icons.py
"""
from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).parent
ORANGE = (242, 138, 0, 255)      # --orange
WHITE = (255, 255, 255, 255)

def _bezier(points, steps=24):
    """Cubic-bezier-chain sampler: points is [anchor, ctrl, ctrl, anchor, ctrl, ctrl, anchor, ...]."""
    pts = []
    n_curves = (len(points) - 1) // 3
    for i in range(n_curves):
        p0, p1, p2, p3 = points[i * 3:i * 3 + 4]
        for s in range(steps):
            t = s / steps
            mt = 1 - t
            x = mt**3 * p0[0] + 3 * mt**2 * t * p1[0] + 3 * mt * t**2 * p2[0] + t**3 * p3[0]
            y = mt**3 * p0[1] + 3 * mt**2 * t * p1[1] + 3 * mt * t**2 * p2[1] + t**3 * p3[1]
            pts.append((x, y))
    return pts


# A single teardrop flame, drawn as two bezier chains (right side down, left
# side back up) — the same silhouette language as the in-app flame glyph,
# redrawn as a smooth filled mark rather than a 24px stroke trace.
FLAME = _bezier([
    (0.50, 0.05),                    # tip
    (0.66, 0.22), (0.72, 0.30),
    (0.72, 0.38),                    # right shoulder (the flame's "waist")
    (0.72, 0.30), (0.80, 0.34),
    (0.82, 0.56),                    # right belly
    (0.82, 0.62), (0.72, 0.78),
    (0.50, 0.84),                    # base
    (0.28, 0.78), (0.18, 0.62),
    (0.18, 0.56),                    # left belly
    (0.20, 0.34), (0.28, 0.30),
    (0.28, 0.38),                    # left shoulder
    (0.28, 0.30), (0.34, 0.22),
    (0.50, 0.05),                    # back to tip
])
FLAME_INNER = _bezier([
    (0.50, 0.42),
    (0.60, 0.52), (0.62, 0.60),
    (0.50, 0.70),
    (0.38, 0.60), (0.40, 0.52),
    (0.50, 0.42),
])


def draw_mark(size, bg_radius_pct, pad_pct):
    """bg_radius_pct: corner radius as % of size. pad_pct: flame inset as % of size (for maskable safe zone)."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    r = int(size * bg_radius_pct)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=r, fill=ORANGE)

    pad = size * pad_pct
    span = size - 2 * pad

    def pt(p):
        return (pad + p[0] * span, pad + p[1] * span)

    d.polygon([pt(p) for p in FLAME], fill=WHITE)
    d.polygon([pt(p) for p in FLAME_INNER], fill=ORANGE)
    return img


def generate(out_dir=OUT):
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    # Standard icons: flame fills most of the tile, square corners (the OS/launcher does its own masking).
    for size in (192, 512):
        draw_mark(size, bg_radius_pct=0.22, pad_pct=0.16).save(out_dir / f"icon-{size}.png")

    # Maskable: content must stay inside the middle ~80% safe zone, background fills the full tile edge-to-edge.
    for size in (192, 512):
        draw_mark(size, bg_radius_pct=0.0, pad_pct=0.24).save(out_dir / f"icon-{size}-maskable.png")

    # Apple touch icon: no transparency, no OS-applied corner radius (iOS rounds it itself), slightly less inset.
    apple = draw_mark(180, bg_radius_pct=0.0, pad_pct=0.14).convert("RGB")
    apple.save(out_dir / "apple-touch-icon.png")

    # Favicon: multi-size ICO for browser tabs.
    sizes = [16, 32, 48]
    favicon_frames = [draw_mark(s, bg_radius_pct=0.22, pad_pct=0.12) for s in sizes]
    favicon_frames[-1].save(out_dir / "favicon.ico", sizes=[(s, s) for s in sizes])
    return out_dir


if __name__ == "__main__":
    out = generate()
    print("wrote:", sorted(p.name for p in out.glob("*.png")), "favicon.ico")
