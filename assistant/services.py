"""AI-powered daily recommendations.

Design notes:
- At most one Claude API call per user per day: `get_todays_recommendations`
  first checks for an existing `Recommendation` row for (user, today) and
  returns it unchanged if present.
- The context sent to the model is anonymized: no name, username, or email —
  only aggregated numbers, note text, upcoming event titles/dates/types, and
  the user's profile `user_type`.
- The model is asked to answer in JSON and is told to pick `article_id` only
  from the article list it was given. The response is parsed defensively;
  any failure (missing key, bad JSON, unknown API error, no API key
  configured, ...) falls through to a rule-based fallback so the demo works
  with zero API access.
"""

from __future__ import annotations

import json
import logging
import re
from datetime import timedelta

from django.conf import settings
from django.utils import timezone

from articles.models import Article
from checkins.models import CheckIn
from events.models import Event

from .models import Recommendation

logger = logging.getLogger(__name__)

RECENT_CHECKIN_WINDOW_DAYS = 14
UPCOMING_EVENT_WINDOW_DAYS = 14
LOW_SLEEP_HOURS = 6.0
HIGH_STRESS_LEVEL = 3.5
LOW_MOOD_LEVEL = 2.5

SYSTEM_PROMPT = """Ты — тёплый, поддерживающий помощник в приложении «AntiВыгорание» \
для профилактики выгорания у школьников и студентов.

Правила:
- Ты НЕ ставишь диагнозов, не используешь медицинские термины и не даёшь советов \
про лекарства или лечение. Это не медицинский сервис.
- Тон — спокойный, тёплый, поддерживающий, без тревожных или пугающих формулировок.
- Дай от 1 до 3 коротких, конкретных и выполнимых рекомендаций на основе данных о \
пользователе.
- Для каждой рекомендации укажи короткое объяснение "почему я это вижу" — опираясь \
только на переданные данные.
- Если рекомендация связана по теме со статьёй из переданного списка, укажи её id \
в поле article_id. Никогда не придумывай статьи и не выбирай id, которого нет в списке. \
Если подходящей статьи нет, поставь article_id в null.
- Отвечай ТОЛЬКО валидным JSON-массивом, без пояснений и без markdown-разметки, \
строго в следующем формате:
[
  {"text": "...", "why_explanation": "...", "article_id": 3},
  {"text": "...", "why_explanation": "...", "article_id": null}
]
"""


def get_todays_recommendations(user) -> list[Recommendation]:
    """Return today's recommendations for `user`, generating them if needed.

    Calls the AI at most once per user per day: if a Recommendation already
    exists for (user, today) it is returned as-is, no API call is made.
    """
    today = timezone.localdate()

    existing = list(Recommendation.objects.filter(user=user, date=today).select_related("article"))
    if existing:
        return existing

    context = _build_context(user, today)
    articles = list(Article.objects.all())

    items = None
    if getattr(settings, "ANTHROPIC_API_KEY", ""):
        items = _call_ai(context, articles)

    if not items:
        items = _fallback_recommendations(context, articles)

    article_by_id = {a.id: a for a in articles}
    created = []
    for item in items:
        article = article_by_id.get(item.get("article_id"))
        created.append(
            Recommendation.objects.create(
                user=user,
                date=today,
                text=item["text"],
                why_explanation=item.get("why_explanation", ""),
                article=article,
                feedback="none",
            )
        )
    return created


# ---------------------------------------------------------------------------
# Context building (anonymized)
# ---------------------------------------------------------------------------


def _build_context(user, today) -> dict:
    """Build an anonymized snapshot of recent data for `user`.

    Never includes name, username, or email — only aggregated numbers, raw
    check-in notes (the user's own free text, not an identifier), upcoming
    event titles/dates/types, and the profile's user_type.
    """
    window_start = today - timedelta(days=RECENT_CHECKIN_WINDOW_DAYS)
    checkins = list(
        CheckIn.objects.filter(user=user, date__gte=window_start, date__lte=today).order_by("-date")
    )

    def _avg(field):
        values = [float(getattr(c, field)) for c in checkins if getattr(c, field) is not None]
        return sum(values) / len(values) if values else None

    recent_notes = [c.note.strip() for c in checkins[:5] if c.note and c.note.strip()]

    upcoming = list(
        Event.objects.filter(
            user=user, date__gte=today, date__lte=today + timedelta(days=UPCOMING_EVENT_WINDOW_DAYS)
        ).order_by("date")[:5]
    )
    upcoming_events = [
        {
            "title": e.title,
            "date": e.date.isoformat(),
            "type": e.type,
            "type_display": e.get_type_display(),
        }
        for e in upcoming
    ]

    profile = getattr(user, "profile", None)
    user_type = getattr(profile, "user_type", "student")

    return {
        "checkin_count": len(checkins),
        "mood_avg": _avg("mood"),
        "energy_avg": _avg("energy"),
        "stress_avg": _avg("stress"),
        "sleep_avg": _avg("sleep_hours"),
        "recent_notes": recent_notes,
        "upcoming_events": upcoming_events,
        "user_type": user_type,
    }


def _format_user_prompt(context: dict, articles: list[Article]) -> str:
    if articles:
        article_lines = "\n".join(f"- id={a.id}, title=\"{a.title}\", category={a.category}" for a in articles)
    else:
        article_lines = "(статей пока нет — во всех рекомендациях используй article_id: null)"

    def fmt(value, digits=1):
        return "нет данных" if value is None else f"{value:.{digits}f}"

    notes = "\n".join(f"- \"{n}\"" for n in context["recent_notes"]) or "(нет заметок)"
    events = (
        "\n".join(f"- {e['title']} ({e['type_display']}, {e['date']})" for e in context["upcoming_events"])
        or "(нет предстоящих событий)"
    )

    return f"""Данные о пользователе за последние {RECENT_CHECKIN_WINDOW_DAYS} дней (анонимно, без имени):

Тип пользователя: {context['user_type']}
Количество отметок за период: {context['checkin_count']}
Среднее настроение (1-5): {fmt(context['mood_avg'])}
Средняя энергия (1-5): {fmt(context['energy_avg'])}
Средний стресс (1-5): {fmt(context['stress_avg'])}
Средний сон (часы): {fmt(context['sleep_avg'])}

Последние заметки пользователя:
{notes}

Предстоящие события:
{events}

Доступные статьи (выбирай article_id только из этого списка или null):
{article_lines}

Дай 1-3 рекомендации в формате, описанном в системной инструкции."""


# ---------------------------------------------------------------------------
# AI call + defensive parsing
# ---------------------------------------------------------------------------


def _call_ai(context: dict, articles: list[Article]) -> list[dict] | None:
    try:
        import anthropic

        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        response = client.messages.create(
            model=settings.AI_MODEL,
            max_tokens=1024,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": _format_user_prompt(context, articles)}],
        )
        text = "".join(block.text for block in response.content if block.type == "text")
        valid_article_ids = {a.id for a in articles}
        return parse_ai_recommendations(text, valid_article_ids)
    except Exception:
        # Any failure here (missing/invalid key, network error, rate limit,
        # timeout, unexpected response shape, ...) falls back to the
        # rule-based recommendations — this is the expected path whenever no
        # real API key is configured, not just an edge case.
        logger.exception("AI recommendation call failed; using fallback recommendations")
        return None


def parse_ai_recommendations(raw_text: str, valid_article_ids: set[int]) -> list[dict] | None:
    """Defensively parse the model's JSON response.

    Returns a list of 1-3 dicts with keys `text`, `why_explanation`,
    `article_id` (validated against `valid_article_ids`, else None), or None
    if the response is not usable in any way.
    """
    if not raw_text or not raw_text.strip():
        return None

    cleaned = raw_text.strip()
    fence_match = re.match(r"^```(?:json)?\s*(.*?)\s*```$", cleaned, flags=re.DOTALL | re.IGNORECASE)
    if fence_match:
        cleaned = fence_match.group(1).strip()

    try:
        data = json.loads(cleaned)
    except (json.JSONDecodeError, TypeError, ValueError):
        return None

    if not isinstance(data, list) or not (1 <= len(data) <= 3):
        return None

    result = []
    for item in data:
        if not isinstance(item, dict):
            return None

        text_val = item.get("text")
        if not isinstance(text_val, str) or not text_val.strip():
            return None

        why_val = item.get("why_explanation", "")
        if not isinstance(why_val, str):
            why_val = ""

        article_id = item.get("article_id")
        if article_id is not None:
            if isinstance(article_id, bool) or not isinstance(article_id, (int, float, str)):
                return None
            try:
                article_id = int(article_id)
            except (TypeError, ValueError):
                return None
            if article_id not in valid_article_ids:
                article_id = None

        result.append({
            "text": text_val.strip(),
            "why_explanation": why_val.strip(),
            "article_id": article_id,
        })

    return result


# ---------------------------------------------------------------------------
# Rule-based fallback
# ---------------------------------------------------------------------------


def _fallback_recommendations(context: dict, articles: list[Article]) -> list[dict]:
    """Varied, sensible rule-based recommendations — the normal demo path."""
    article_by_category: dict[str, Article] = {}
    for article in articles:
        article_by_category.setdefault(article.category, article)

    def article_id_for(*categories):
        for category in categories:
            article = article_by_category.get(category)
            if article:
                return article.id
        return None

    candidates = []

    sleep_avg = context["sleep_avg"]
    stress_avg = context["stress_avg"]
    mood_avg = context["mood_avg"]
    upcoming_events = context["upcoming_events"]

    if sleep_avg is not None and sleep_avg < LOW_SLEEP_HOURS:
        candidates.append({
            "text": "Сегодня попробуй лечь спать на час раньше обычного",
            "why_explanation": (
                f"В последние дни твой сон в среднем составлял около {sleep_avg:.1f} ч — "
                "это меньше, чем нужно для восстановления."
            ),
            "article_id": article_id_for("sleep"),
        })

    if stress_avg is not None and stress_avg >= HIGH_STRESS_LEVEL:
        candidates.append({
            "text": "Сделай 5 минут дыхательной практики между делами",
            "why_explanation": "Уровень стресса в твоих последних отметках держится выше среднего.",
            "article_id": article_id_for("stress_burnout", "work_rest_balance"),
        })

    if mood_avg is not None and mood_avg <= LOW_MOOD_LEVEL:
        candidates.append({
            "text": "Напиши или позвони близкому человеку сегодня — просто чтобы поговорить",
            "why_explanation": (
                "Твоё настроение в последних отметках было ниже обычного — поддержка "
                "рядом часто помогает больше всего."
            ),
            "article_id": article_id_for("emotional_health", "asking_for_help"),
        })

    if upcoming_events:
        event = upcoming_events[0]
        candidates.append({
            "text": f"Раздели подготовку к «{event['title']}» на небольшие шаги",
            "why_explanation": (
                f"Скоро у тебя {event['type_display'].lower()} ({event['date']}) — маленькие "
                "спланированные шаги снижают напряжение перед важным событием."
            ),
            "article_id": article_id_for("exam_prep", "time_management"),
        })

    if not candidates:
        candidates.append({
            "text": "Сделай короткую паузу в течение дня — 5–10 минут без дел",
            "why_explanation": (
                "Ты начал(а) отмечать своё состояние — небольшие паузы в течение дня "
                "помогают держать баланс."
            ),
            "article_id": article_id_for("work_rest_balance"),
        })

    return candidates[:3]
