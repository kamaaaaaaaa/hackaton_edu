import json

from django.contrib.auth.decorators import login_required
from django.shortcuts import render
from django.utils import timezone

from assistant.services import get_todays_recommendations
from checkins.forms import CheckInForm
from checkins.models import CheckIn
from checkins.services import (
    get_chart_series,
    get_current_streak,
    get_sleep_pattern,
    get_status_display,
    get_trend_days,
    get_week_summary,
)
from surveys.models import WeeklySurvey
from surveys.services import due_for_survey

MOOD_EMOJI = {1: "😞", 2: "😕", 3: "😐", 4: "🙂", 5: "😄"}

# Static example bar heights (%) for the "last 7 days" trend glimpse until
# real aggregation exists — matches the approved mockup's placeholder shape.
PLACEHOLDER_TREND_DAYS = [
    ("Пн", 55), ("Вт", 70), ("Ср", 40), ("Чт", 65),
    ("Пт", 50), ("Сб", 30), ("Вс", 60),
]

WEEKDAY_NAMES_RU = [
    "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье",
]
MONTH_NAMES_RU = [
    "января", "февраля", "марта", "апреля", "мая", "июня",
    "июля", "августа", "сентября", "октября", "ноября", "декабря",
]


def home(request):
    today = timezone.localdate()
    today_display = f"{WEEKDAY_NAMES_RU[today.weekday()]}, {today.day} {MONTH_NAMES_RU[today.month - 1]}"

    today_checkin = None
    checkin_form = None
    recommendations = []
    status_display = None
    trend_days = PLACEHOLDER_TREND_DAYS
    if request.user.is_authenticated:
        today_checkin = CheckIn.objects.filter(user=request.user, date=today).first()
        checkin_form = CheckInForm(instance=today_checkin)
        recommendations = get_todays_recommendations(request.user)
        status_display = get_status_display(request.user)
        trend_days = get_trend_days(request.user)

    return render(request, "core/home.html", {
        "today_display": today_display,
        "recommendations": recommendations,
        "today_checkin": today_checkin,
        "today_checkin_mood_emoji": MOOD_EMOJI.get(today_checkin.mood) if today_checkin else None,
        "checkin_form": checkin_form,
        "trend_days": trend_days,
        "status_display": status_display,
        "survey_due": due_for_survey(request.user),
    })


def placeholder_page(request, heading, description, bullets=None):
    """Shared renderer for on-theme "coming soon" sections.

    Used by apps whose real functionality isn't built yet, so every
    unfinished section still looks intentional instead of a broken link.
    """
    return render(request, "core/placeholder.html", {
        "heading": heading,
        "description": description,
        "bullets": bullets or [],
    })


@login_required
def progress(request):
    """Personal history: 14/30-day Chart.js trend lines, a week summary,
    an optional sleep/stress pattern (only shown with enough data on both
    sides — see checkins.services.get_sleep_pattern), a soft check-in
    streak, and (read-only) recent weekly survey results.
    """
    chart_14 = get_chart_series(request.user, 14)
    chart_30 = get_chart_series(request.user, 30)

    return render(request, "core/progress.html", {
        "chart_14_json": json.dumps(chart_14),
        "chart_30_json": json.dumps(chart_30),
        "has_any_checkins": any(chart_30["mood"]),
        "week_summary": get_week_summary(request.user),
        "sleep_pattern": get_sleep_pattern(request.user),
        "streak": get_current_streak(request.user),
        # Read-only: surveys app owns the survey-taking UI. This just
        # displays whatever WeeklySurvey results already exist for this
        # user, most recent first.
        "weekly_surveys": WeeklySurvey.objects.filter(user=request.user).order_by("-date")[:5],
    })
