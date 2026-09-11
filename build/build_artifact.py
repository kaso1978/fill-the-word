#!/usr/bin/env python3
"""src/Fill the Word.dc.html  ->  dist/artifact.html + dist/preview.html

dist/artifact.html is what gets published as a Claude Artifact. The Artifact tool
wraps whatever you give it in its own <!doctype html><head></head><body> skeleton,
so this file deliberately has no doctype/html/head/body of its own.

dist/preview.html is the same content wrapped in a close copy of that skeleton, so
it can be opened in a browser or driven by the tests without publishing anything.

Why this exists at all: the DC runtime fetches React from unpkg, and the published
bundle unpacks itself through blob: URLs. Neither survives the Artifact host's CSP.
So everything gets inlined and the page ends up making no network calls.
"""
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _shared import (  # noqa: E402
    DIST, SRC, SUPPORT, assets, check_support_matches_bundle, escape_script,
    font_face_css, react_pair, read_shell, UUID_RE,
)

# Mirrors the skeleton the Artifact host injects: charset, viewport and a small reset.
PREVIEW_HEAD = (
    '<!doctype html><html><head><meta charset="utf-8">'
    '<meta name="viewport" content="width=device-width, initial-scale=1">'
    '<style>:root{color-scheme:light}body{margin:0;font:14px system-ui;background:#faf9f7}'
    'img{max-width:100%}[hidden]{display:none!important}</style>'
    '</head><body>'
)
PREVIEW_TAIL = '</body></html>'


def wrap_preview(page):
    return PREVIEW_HEAD + page + PREVIEW_TAIL


def main():
    _, manifest, template = read_shell()
    assets_map = assets(manifest)
    check_support_matches_bundle(assets_map)

    react, react_dom = react_pair(assets_map)
    runtime = SUPPORT.read_text(encoding="utf-8")
    src = SRC.read_text(encoding="utf-8")

    # 1. Inline React, ReactDOM and the runtime, in that order. loadReactUmd() in
    #    support.js short-circuits when window.React and window.ReactDOM exist, so
    #    the unpkg fetch never happens.
    inline = "\n".join(
        "<script>%s</script>" % escape_script(js) for js in (react, react_dom, runtime)
    )
    tag = '<script src="./support.js"></script>'
    assert tag in src, "runtime script tag not found in the source"
    src = src.replace(tag, inline, 1)

    # 2. Swap the Google Fonts stylesheet for the embedded faces.
    link = re.search(r'<link href="https://fonts\.googleapis\.com/css2[^"]*" rel="stylesheet">', src)
    assert link, "Google Fonts link not found in the source"
    src = src.replace(link.group(0), font_face_css(template, assets_map), 1)

    # 3. Strip the document skeleton; keep our viewport meta (it carries
    #    viewport-fit=cover, which the host's does not) by letting it ride along in
    #    the body, where it lands after the host's and wins.
    head = src[src.index("<head>") + len("<head>"):src.index("</head>")]
    body = src[src.index("<body>") + len("<body>"):src.rindex("</body>")]
    head = re.sub(r'<meta charset="utf-8">\s*', "", head)

    page = (
        "<title>Fill the Word</title>\n"
        "<script>window.__resources = window.__resources || {};</script>\n"
        + head.strip() + "\n" + body.strip() + "\n"
    )

    leftover = re.findall(UUID_RE, page)
    assert not leftover, "unresolved bundle uuids: %s" % set(leftover)

    DIST.mkdir(exist_ok=True)
    (DIST / "artifact.html").write_text(page, encoding="utf-8")
    (DIST / "preview.html").write_text(wrap_preview(page), encoding="utf-8")
    print("dist/artifact.html  %7d bytes" % len(page))
    print("dist/preview.html   %7d bytes" % len(wrap_preview(page)))


if __name__ == "__main__":
    main()
