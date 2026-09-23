from pathlib import Path

from django.conf import settings
from django.http import HttpResponse

FRONTEND_INDEX = Path(settings.BASE_DIR) / "frontend_dist" / "index.html"
_INDEX_CACHE = None


def spa(request, path=""):
    """Serve the built React app's index.html for any non-API/non-admin route.

    The actual JS/CSS/manifest/service-worker files under frontend_dist are
    served directly by WhiteNoise (see WHITENOISE_ROOT in settings.py) before
    a request ever reaches this view — this only handles the HTML shell, for
    both the real "/" and every client-side route React Router owns
    (/map, /family, /checklist, ...), so a hard refresh on any of those
    doesn't 404.
    """
    global _INDEX_CACHE
    if _INDEX_CACHE is None:
        _INDEX_CACHE = FRONTEND_INDEX.read_text(encoding="utf-8")
    return HttpResponse(_INDEX_CACHE, content_type="text/html")
