"""Scheduling helper for the weekly Copenhagen Burnout Inventory prompt."""
from django.conf import settings
from django.utils import timezone


def due_for_survey(user) -> bool:
    """True if `user` hasn't taken the weekly survey in the configured interval."""
    if not user.is_authenticated:
        return False
    from .models import WeeklySurvey

    last = WeeklySurvey.objects.filter(user=user).order_by("-date").first()
    if last is None:
        return True
    days_since = (timezone.localdate() - last.date).days
    return days_since >= settings.WEEKLY_SURVEY_INTERVAL_DAYS


# рабочий перевод, требует проверки носителем языка
def interpret_score(score) -> str:
    """Rough, non-diagnostic banding of the CBI personal-burnout 0-100 score."""
    score = float(score)
    if score < 25:
        return "Низкий уровень истощения — судя по ответам, сейчас всё довольно спокойно."
    if score < 50:
        return "Средний уровень истощения — стоит присматриваться к своему отдыху и сну."
    if score < 75:
        return "Повышенный уровень истощения — возможно, стоит немного снизить нагрузку и больше отдыхать."
    return "Высокий уровень истощения — обрати на себя особое внимание в ближайшие дни, и не стесняйся обратиться за поддержкой."
