#!/usr/bin/env python3
"""src/Fill the Word.dc.html  ->  dist/Fill the Word (standalone).html

A self-unpacking single file that opens offline in any browser. It is the same
format the Design Component publisher emits: a loader plus a manifest of gzipped
assets plus the page template as a JSON string. We keep the vendored bundle's
loader and manifest untouched and swap in a new template payload.

If the publisher's own tooling is available, re-running that is the cleaner path.
This exists so the offline build can be regenerated without it.
"""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _shared import (  # noqa: E402
    DIST, RUNTIME_UUID, SRC, assets, check_support_matches_bundle, read_shell,
)


def encode_camel_attrs(html):
    """The publisher stores camelCase attributes kebab-cased behind an sc-camel-
    prefix: onClick -> sc-camel-on-click, viewBox -> sc-camel-view-box. The
    runtime decodes them on parse."""
    def repl(m):
        kebab = re.sub(r"([A-Z])", lambda c: "-" + c.group(1).lower(), m.group(1))
        return ' sc-camel-%s="' % kebab
    return re.sub(r' (on[A-Z]\w*|viewBox)="', repl, html)


def main():
    shell, manifest, old_template = read_shell()
    check_support_matches_bundle(assets(manifest))

    src = SRC.read_text(encoding="utf-8")

    # Point the runtime <script> at the manifest asset instead of the sibling file.
    tag = '<script src="./support.js"></script>'
    assert tag in src, "runtime script tag not found in the source"
    src = src.replace(tag, '<script src="%s"></script>' % RUNTIME_UUID, 1)

    # The old template's @font-face block already references the font uuids.
    i = old_template.index("<style>/* latin-ext */")
    j = old_template.index("</style>", i) + len("</style>")
    link = re.search(r'<link href="https://fonts\.googleapis\.com/css2[^"]*" rel="stylesheet">', src)
    assert link, "Google Fonts link not found in the source"
    src = src.replace(link.group(0), old_template[i:j], 1)

    payload = json.dumps(encode_camel_attrs(src)).replace("</script>", "<\\u002Fscript>")
    m = re.search(r'(<script type="__bundler/template">)(.*?)(</script>)', shell, re.S)
    out = shell[:m.start(2)] + payload + shell[m.end(2):]
    assert out != shell, "template substitution failed"

    DIST.mkdir(exist_ok=True)
    target = DIST / "Fill the Word (standalone).html"
    target.write_text(out, encoding="utf-8")
    print("dist/%s  %7d bytes" % (target.name, len(out)))


if __name__ == "__main__":
    main()
