"""Asset extraction shared by both builds.

Everything the page needs at runtime — the Design Component runtime, React,
ReactDOM and the four Figtree faces — ships inside the published DC bundle at
build/vendor/dc-bundle-shell.html. We read it out of there rather than fetching
from a CDN so the builds are hermetic and the artifact makes zero network calls.
"""
import base64
import gzip
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src" / "Fill the Word.dc.html"
SUPPORT = ROOT / "src" / "support.js"
SHELL = ROOT / "build" / "vendor" / "dc-bundle-shell.html"
DIST = ROOT / "dist"

RUNTIME_UUID = "39fa7e37-f806-4774-b7c2-6ef821f4919c"
UUID_RE = r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"


def read_shell():
    """-> (shell_text, manifest_dict, template_string)"""
    text = SHELL.read_text(encoding="utf-8")
    manifest = json.loads(
        re.search(r'<script type="__bundler/manifest">(.*?)</script>', text, re.S).group(1)
    )
    template = json.loads(
        re.search(r'<script type="__bundler/template">(.*?)</script>', text, re.S).group(1)
    )
    return text, manifest, template


def assets(manifest):
    """uuid -> (mime, decompressed bytes)"""
    out = {}
    for uuid, entry in manifest.items():
        raw = base64.b64decode(entry["data"])
        if entry["compressed"]:
            raw = gzip.decompress(raw)
        out[uuid] = (entry["mime"], raw)
    return out


def react_pair(assets_map):
    """-> (react_umd_source, react_dom_umd_source)"""
    js = [
        (uuid, raw.decode("utf-8"))
        for uuid, (mime, raw) in assets_map.items()
        if mime == "text/javascript" and uuid != RUNTIME_UUID
    ]
    def is_dom(text):
        return "react-dom.production" in text[:300] or "ReactDOM" in text[:1500]
    core = [t for _, t in js if not is_dom(t)]
    dom = [t for _, t in js if is_dom(t)]
    assert len(core) == 1 and len(dom) == 1, "expected exactly one React and one ReactDOM in the bundle"
    return core[0], dom[0]


def font_face_css(template, assets_map):
    """The bundle's @font-face block with the uuid refs swapped for data: URIs."""
    i = template.index("<style>/* latin-ext */")
    j = template.index("</style>", i) + len("</style>")
    css = template[i:j]
    for uuid, (mime, raw) in assets_map.items():
        if mime.startswith("font/") and uuid in css:
            data = base64.b64encode(raw).decode()
            css = css.replace(uuid, "data:%s;base64,%s" % (mime, data))
    assert "data:font/woff2" in css, "font faces did not resolve"
    return css


def check_support_matches_bundle(assets_map):
    """src/support.js is vendored. If someone edits it, the standalone build
    would silently keep using the copy inside the bundle — say so loudly."""
    if SUPPORT.read_bytes() != assets_map[RUNTIME_UUID][1]:
        print(
            "WARNING: src/support.js differs from the runtime inside "
            "build/vendor/dc-bundle-shell.html.\n"
            "         build_artifact.py uses src/support.js; build_standalone.py uses the\n"
            "         bundle's copy. They have diverged and the two builds will not match."
        )


def escape_script(js):
    return js.replace("</script>", "<\\/script>")
