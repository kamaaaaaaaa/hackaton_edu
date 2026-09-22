#!/usr/bin/env python3
"""
check_ai_slop.py

CI lint that scans templates/ and static/ for the objective, unambiguous
"this looks like it was churned out by an AI page-builder" red flags:

  - emoji characters anywhere in .html files
  - href="#" dead links
  - forbidden strings left over from AI scaffolding tools (lovable.app,
    vercel.app, bolt.new, "Edit with Lovable", "Vite + React", shadcn,
    lucide)
  - gradient / glassmorphism CSS in the purple/violet/pink/magenta family
    (backdrop-filter: blur, or linear-gradient(...) combined with a
    purple-ish color)

Exits 1 and prints file:line + what matched if anything turns up.
Exits 0 (silently) if the scan is clean.

Deliberately NOT auto-checked here (needs human judgment, would produce
false positives on legitimate future work) -- review these manually when
reviewing any new design PR:
  - generic templated hero-page structure (badge pill, big centered
    heading, two CTA buttons, three-icon-card grid, stats block,
    testimonials, three-column pricing with a "popular" middle tier,
    FAQ accordion, bento grid, footer link columns)
  - empty marketing copy ("unlock your potential", "seamless
    integration", "next-generation solution", etc.)
  - fake testimonials / circular-avatar initials / "trusted by" logo
    walls / round-number stats
  - stock-photo or fake wireframe "dashboard" imagery in place of real
    screenshots
  - overuse of heavy rounded corners + soft shadows on literally
    everything
  - long chained Tailwind utility classes / shadcn components left at
    default settings (this is a Bootstrap/Django project so unlikely,
    but keep an eye out if that ever changes)
"""

import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
SCAN_DIRS = ["templates", "static"]

# --- emoji detection -------------------------------------------------------
# Main Unicode blocks emoji live in, plus the variation-selector-16 that
# turns some dingbats (e.g. U+1F6E0 FE0F "hammer and wrench") into emoji.
EMOJI_PATTERN = re.compile(
    "["
    "\U0001F300-\U0001FAFF"  # misc symbols/pictographs, transport, supplemental, extended-A
    "\U00002600-\U000027BF"  # misc symbols & dingbats
    "\U0001F1E6-\U0001F1FF"  # regional indicator symbols (flags)
    "\U00002B00-\U00002BFF"  # misc symbols and arrows (includes some star/arrow emoji)
    "\U0001F900-\U0001F9FF"  # supplemental symbols and pictographs
    "\U00002190-\U000021FF"  # arrows (only the emoji-presentation ones matter, but rare to hit here)
    "\U00003030\U0000303D\U00003297\U00003299"
    "\U0000FE0F"  # variation selector-16 (emoji presentation)
    "]"
)

# --- forbidden strings from AI scaffolding tools ---------------------------
FORBIDDEN_STRINGS = [
    "lovable.app",
    "vercel.app",
    "bolt.new",
    "Edit with Lovable",
    "Vite + React",
    "shadcn",
    "lucide",
]

# --- dead links --------------------------------------------------------------
HREF_HASH_PATTERN = re.compile(r'href\s*=\s*["\']#["\']')

# --- gradient / glassmorphism ------------------------------------------------
BACKDROP_BLUR_PATTERN = re.compile(r"backdrop-filter\s*:\s*blur", re.IGNORECASE)
LINEAR_GRADIENT_PATTERN = re.compile(r"linear-gradient\s*\(", re.IGNORECASE)
HEX_COLOR_PATTERN = re.compile(r"#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b")

PURPLE_FAMILY_KEYWORDS = [
    "purple",
    "violet",
    "magenta",
    "fuchsia",
    "orchid",
    "plum",
    "lavender",
    "indigo",
    "pink",
    "mediumpurple",
    "blueviolet",
    "darkviolet",
    "darkmagenta",
    "mediumvioletred",
    "deeppink",
    "hotpink",
    "palevioletred",
    "mediumorchid",
    "darkorchid",
    "rebeccapurple",
]


def _hex_to_rgb(hex_str):
    if len(hex_str) == 3:
        hex_str = "".join(c * 2 for c in hex_str)
    r = int(hex_str[0:2], 16)
    g = int(hex_str[2:4], 16)
    b = int(hex_str[4:6], 16)
    return r, g, b


def _is_purple_family_hex(hex_str):
    """Heuristic: purple/violet/pink/magenta all share red & blue channels
    both notably higher than green (roughly hue 270-330 degrees)."""
    r, g, b = _hex_to_rgb(hex_str)
    if r < 60 and b < 60:
        return False  # too dark/black to read as a color family
    # both red and blue meaningfully exceed green -> purple/violet/pink/magenta hue range
    return r > g + 25 and b > g + 15


def line_has_purple_gradient(line):
    if not LINEAR_GRADIENT_PATTERN.search(line):
        return False
    lowered = line.lower()
    if any(keyword in lowered for keyword in PURPLE_FAMILY_KEYWORDS):
        return True
    for match in HEX_COLOR_PATTERN.finditer(line):
        if _is_purple_family_hex(match.group(1)):
            return True
    return False


def iter_files(extensions):
    for dir_name in SCAN_DIRS:
        base = REPO_ROOT / dir_name
        if not base.exists():
            continue
        for path in sorted(base.rglob("*")):
            if path.is_file() and path.suffix.lower() in extensions:
                yield path


def scan_html_and_css(path, findings):
    try:
        text = path.read_text(encoding="utf-8")
    except (UnicodeDecodeError, OSError):
        return

    rel = path.relative_to(REPO_ROOT)
    for lineno, line in enumerate(text.splitlines(), start=1):
        for emoji_match in EMOJI_PATTERN.finditer(line):
            findings.append(
                f"{rel}:{lineno}: emoji character {emoji_match.group()!r} found -> {line.strip()!r}"
            )

        if HREF_HASH_PATTERN.search(line):
            findings.append(f'{rel}:{lineno}: dead link href="#" -> {line.strip()!r}')

        for forbidden in FORBIDDEN_STRINGS:
            if forbidden.lower() in line.lower():
                findings.append(
                    f"{rel}:{lineno}: forbidden string {forbidden!r} found -> {line.strip()!r}"
                )

        if BACKDROP_BLUR_PATTERN.search(line):
            findings.append(
                f"{rel}:{lineno}: glassmorphism 'backdrop-filter: blur' found -> {line.strip()!r}"
            )

        if line_has_purple_gradient(line):
            findings.append(
                f"{rel}:{lineno}: purple/violet/pink gradient found -> {line.strip()!r}"
            )


def main():
    findings = []
    for path in iter_files({".html", ".css"}):
        scan_html_and_css(path, findings)

    if findings:
        print("check_ai_slop.py: found AI-generator tells:\n")
        for finding in findings:
            print(f"  {finding}")
        print(f"\n{len(findings)} issue(s) found. Fix them before merging.")
        return 1

    print("check_ai_slop.py: clean, no AI-generator tells found.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
