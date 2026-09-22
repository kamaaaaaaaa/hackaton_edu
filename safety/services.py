"""Crisis-safety utilities.

`contains_crisis_keywords` is a deliberately dumb, hard-coded rule — NOT an
AI call — per the product spec: crisis detection must be predictable and
fast, never depend on an external API being up. Extend the keyword list
in settings (`CRISIS_KEYWORDS`) as needed; don't rewrite the matching logic
without keeping it a plain, explainable substring check.
"""
from django.conf import settings


def contains_crisis_keywords(text: str) -> bool:
    if not text:
        return False
    lowered = text.lower()
    return any(keyword in lowered for keyword in settings.CRISIS_KEYWORDS)
