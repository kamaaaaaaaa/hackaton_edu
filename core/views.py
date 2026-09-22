from django.shortcuts import render
from django.utils import timezone

from checkins.forms import CheckInForm
from checkins.models import CheckIn

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

# Placeholder AI-recommendation copy until the real assistant backend exists.
# Non-diagnostic, warm tone — matches the approved mockup's example content.
PLACEHOLDER_RECOMMENDATIONS = [
    {
        "title": "Короткий перерыв между парами",
        "why": "Твой уровень энергии на этой неделе ниже обычного, а между парами ты почти не отдыхаешь.",
    },
    {
        "title": "Сегодня ляг спать на час раньше",
        "why": "За последние 4 дня ты спал(а) меньше 6 часов — это ниже твоей обычной нормы сна.",
    },
    {
        "title": "5 минут дыхательной практики",
        "why": "Уровень стресса выше твоего обычного третий день подряд.",
    },
]


def home(request):
    today = timezone.localdate()
    today_display = f"{WEEKDAY_NAMES_RU[today.weekday()]}, {today.day} {MONTH_NAMES_RU[today.month - 1]}"

    today_checkin = None
    checkin_form = None
    if request.user.is_authenticated:
        today_checkin = CheckIn.objects.filter(user=request.user, date=today).first()
        checkin_form = CheckInForm(instance=today_checkin)

    return render(request, "core/home.html", {
        "today_display": today_display,
        "recommendations": PLACEHOLDER_RECOMMENDATIONS,
        "today_checkin": today_checkin,
        "today_checkin_mood_emoji": MOOD_EMOJI.get(today_checkin.mood) if today_checkin else None,
        "checkin_form": checkin_form,
        "trend_days": PLACEHOLDER_TREND_DAYS,
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


def progress(request):
    return placeholder_page(
        request,
        "Мой прогресс",
        "Здесь появится история твоих отметок и личная динамика за недели и месяцы — "
        "без сравнения с другими, только с тобой самим(ой).",
        [
            "Графики настроения, энергии и стресса по дням",
            "Результаты еженедельного опросника выгорания",
            "Отмеченные события: экзамены, дедлайны, проекты",
        ],
    )
