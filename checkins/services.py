"""Personal-baseline burnout early-warning.

Every user is compared only to their OWN history, never to other users or
to a fixed scale — a single check-in's absolute mood/energy/stress numbers
mean nothing on their own. What matters is a SUSTAINED move away from this
person's normal range. That's the core "no false alarms" promise: a single
bad day must never escalate the status, only a run of several does.

Levels (exact strings the UI shows), plus one precondition state:
- "Собираем данные"                          — not enough history yet (precondition, not a real level)
- "Всё в порядке"                            — STATUS_OK
- "Стоит обратить внимание"                  — STATUS_ATTENTION
- "Хорошо бы поговорить со специалистом"     — STATUS_SPECIALIST
"""
from dataclasses import dataclass
from datetime import timedelta
from statistics import mean, pstdev

from django.conf import settings
from django.utils import timezone

from .models import CheckIn

STATUS_COLLECTING = "collecting"
STATUS_OK = "ok"
STATUS_ATTENTION = "attention"
STATUS_SPECIALIST = "specialist"

STATUS_LABELS = {
    STATUS_COLLECTING: "Собираем данные",
    STATUS_OK: "Всё в порядке",
    STATUS_ATTENTION: "Стоит обратить внимание",
    STATUS_SPECIALIST: "Хорошо бы поговорить со специалистом",
}

STATUS_CSS_CLASS = {
    STATUS_COLLECTING: "baseline-muted",
    STATUS_OK: "baseline-teal",
    STATUS_ATTENTION: "baseline-ochre",
    STATUS_SPECIALIST: "baseline-rose",
}

WEEKDAY_SHORT_RU = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]


def _composite(checkin):
    """A single "how are they doing" number for one day: higher is better.

    mood/energy pull it up, stress pulls it down; all three live on the
    same 1-5 scale so they're simply summed/subtracted, no weighting.
    """
    return checkin.mood + checkin.energy - checkin.stress


@dataclass
class Baseline:
    """This user's own normal range, computed once from their earliest days."""

    mean: float
    stdev: float
    sample_size: int
    stress_mean: float
    stress_stdev: float
    mood_mean: float
    energy_mean: float


def get_baseline(user):
    """This user's personal baseline, from their EARLIEST check-ins.

    Uses the first BURNOUT_BASELINE_FULL_DAYS check-ins (not the most
    recent ones) so the "normal" that a later decline gets measured
    against isn't itself contaminated by that decline. Returns None if the
    user hasn't logged BURNOUT_BASELINE_MIN_DAYS check-ins yet — too little
    data to say anything meaningful ("Собираем данные" precondition).
    """
    checkins = list(
        CheckIn.objects.filter(user=user).order_by("date")[: settings.BURNOUT_BASELINE_FULL_DAYS]
    )
    if len(checkins) < settings.BURNOUT_BASELINE_MIN_DAYS:
        return None

    scores = [_composite(c) for c in checkins]
    stresses = [c.stress for c in checkins]
    moods = [c.mood for c in checkins]
    energies = [c.energy for c in checkins]
    return Baseline(
        mean=mean(scores),
        stdev=pstdev(scores),
        sample_size=len(checkins),
        stress_mean=mean(stresses),
        stress_stdev=pstdev(stresses),
        mood_mean=mean(moods),
        energy_mean=mean(energies),
    )


def get_recent_checkins(user, days=None):
    """This user's check-ins, most-recent-first, optionally capped to the
    last `days` entries. With no cap, returns their whole history (fine —
    this product's per-user check-in counts are small)."""
    qs = CheckIn.objects.filter(user=user).order_by("-date")
    if days is not None:
        qs = qs[:days]
    return list(qs)


def get_rolling_average(user, days=None):
    """Mean composite score over the user's last `days` check-ins
    (default: BURNOUT_TREND_WINDOW_DAYS). None if they have no check-ins."""
    days = days or settings.BURNOUT_TREND_WINDOW_DAYS
    recent = get_recent_checkins(user, days=days)
    if not recent:
        return None
    return mean(_composite(c) for c in recent)


def _consecutive_decline_streak(checkins, baseline):
    """How many most-recent CONSECUTIVE calendar days score worse than
    baseline, scanning back from the latest check-in.

    "Consecutive" means consecutive days, not just consecutive rows: a gap
    in the calendar (a missed check-in) breaks the streak, same as a day
    that wasn't actually worse than baseline. This is what keeps a single
    bad day — or scattered bad days — from ever counting as sustained
    decline.

    Returns (streak_length, average_deficit_over_the_streak).
    """
    streak = 0
    deficits = []
    previous_date = None
    for checkin in checkins:  # already most-recent-first
        if previous_date is not None and (previous_date - checkin.date).days != 1:
            break  # gap in the calendar — the sustained run ends here
        deficit = baseline.mean - _composite(checkin)
        if deficit <= 0:
            break  # this day was at/above baseline — streak ends
        streak += 1
        deficits.append(deficit)
        previous_date = checkin.date
    return streak, (mean(deficits) if deficits else 0.0)


def get_burnout_status(user):
    """The headline burnout status: (status_code, label, detail_dict).

    Escalates only on a SUSTAINED run of at least
    BURNOUT_CONSECUTIVE_DECLINE_DAYS consecutive days trending worse than
    this user's own baseline. A single bad day, or bad days with gaps
    between them, never escalates the status — see module docstring.
    """
    baseline = get_baseline(user)
    if baseline is None:
        return STATUS_COLLECTING, STATUS_LABELS[STATUS_COLLECTING], {}

    recent = get_recent_checkins(user)  # full history; the streak scan self-limits
    streak, avg_deficit = _consecutive_decline_streak(recent, baseline)
    required = settings.BURNOUT_CONSECUTIVE_DECLINE_DAYS

    if streak < required:
        status = STATUS_OK
    else:
        # Sustained decline is already established (streak >= required).
        # Escalate further to "talk to a specialist" only when it's also
        # either markedly worse in magnitude (more than one baseline
        # stdev below normal — with a floor, since an integer 1-5 scale
        # can have a near-zero stdev) or has gone on twice as long as the
        # minimum sustained-decline window.
        severe_magnitude = avg_deficit >= max(baseline.stdev, 1.0)
        severe_duration = streak >= required * 2
        status = STATUS_SPECIALIST if (severe_magnitude or severe_duration) else STATUS_ATTENTION

    rolling_avg = get_rolling_average(user)
    return status, STATUS_LABELS[status], {
        "baseline_mean": round(baseline.mean, 2),
        "rolling_average": round(rolling_avg, 2) if rolling_avg is not None else None,
        "consecutive_decline_days": streak,
    }


def get_status_display(user):
    """Everything the home/progress pages need to render the baseline
    status pill: label, CSS class, and a plain-language description."""
    status, label, detail = get_burnout_status(user)
    descriptions = {
        STATUS_COLLECTING: (
            f"Собираем данные о твоём состоянии — личный статус появится "
            f"после {settings.BURNOUT_BASELINE_MIN_DAYS} отметок."
        ),
        STATUS_OK: "Твои показатели соответствуют твоей обычной норме. Продолжай в том же духе.",
        STATUS_ATTENTION: (
            "Несколько дней подряд твоё состояние отличается от привычной нормы. "
            "Это не диагноз — просто повод немного бережнее отнестись к себе на этой неделе."
        ),
        STATUS_SPECIALIST: (
            "Твоё состояние заметно и стабильно отличается от нормы уже несколько дней. "
            "Это не диагноз, но возможно стоит поговорить со специалистом."
        ),
    }
    return {
        "status": status,
        "label": label,
        "css_class": STATUS_CSS_CLASS[status],
        "description": descriptions[status],
        **detail,
    }


def get_trend_days(user, days=None):
    """(weekday_label, bar_height_percent) pairs for the last `days`
    calendar days (default: BURNOUT_TREND_WINDOW_DAYS), oldest first, for
    the home page's trend-glimpse bars. A day with no check-in shows a 0
    bar rather than being skipped, so the week's shape stays readable."""
    days = days or settings.BURNOUT_TREND_WINDOW_DAYS
    today = timezone.localdate()
    start = today - timedelta(days=days - 1)
    checkins_by_date = {
        c.date: c
        for c in CheckIn.objects.filter(user=user, date__gte=start, date__lte=today)
    }
    result = []
    for offset in range(days):
        day = start + timedelta(days=offset)
        checkin = checkins_by_date.get(day)
        if checkin is not None:
            combined = (checkin.mood + checkin.energy + (6 - checkin.stress)) / 3
            height = round(combined / 5 * 100)
        else:
            height = 0
        result.append((WEEKDAY_SHORT_RU[day.weekday()], height))
    return result


# ---------------------------------------------------------------------------
# Progress page aggregation (core/views.py::progress)
# ---------------------------------------------------------------------------

def get_chart_series(user, days):
    """(labels, mood, energy, stress) lists for the last `days` calendar
    days, oldest first — feeds the progress page's Chart.js line charts.
    A day with no check-in is `None` in each metric list so Chart.js draws
    a gap instead of a misleading zero."""
    today = timezone.localdate()
    start = today - timedelta(days=days - 1)
    checkins_by_date = {
        c.date: c
        for c in CheckIn.objects.filter(user=user, date__gte=start, date__lte=today)
    }
    labels, mood, energy, stress = [], [], [], []
    for offset in range(days):
        day = start + timedelta(days=offset)
        checkin = checkins_by_date.get(day)
        labels.append(day.strftime("%d.%m"))
        mood.append(checkin.mood if checkin else None)
        energy.append(checkin.energy if checkin else None)
        stress.append(checkin.stress if checkin else None)
    return {"labels": labels, "mood": mood, "energy": energy, "stress": stress}


def get_week_summary(user, days=None):
    """Plain averages over the last `days` check-ins (default:
    BURNOUT_TREND_WINDOW_DAYS). None if the user has no check-ins at all."""
    days = days or settings.BURNOUT_TREND_WINDOW_DAYS
    recent = get_recent_checkins(user, days=days)
    if not recent:
        return None
    return {
        "days": days,
        "checkin_count": len(recent),
        "avg_mood": round(mean(c.mood for c in recent), 1),
        "avg_energy": round(mean(c.energy for c in recent), 1),
        "avg_stress": round(mean(c.stress for c in recent), 1),
    }


def get_sleep_pattern(user, threshold_hours=6, min_each_side=3):
    """Average stress on nights with < threshold_hours sleep vs. >=
    threshold_hours — only returned when there's enough data on BOTH sides
    (>= min_each_side check-ins each) to say anything real. Returns None
    otherwise, so the progress page can omit the section entirely rather
    than show a "pattern" drawn from a single data point."""
    checkins = CheckIn.objects.filter(user=user)
    low = [c.stress for c in checkins if c.sleep_hours < threshold_hours]
    high = [c.stress for c in checkins if c.sleep_hours >= threshold_hours]
    if len(low) < min_each_side or len(high) < min_each_side:
        return None
    return {
        "threshold_hours": threshold_hours,
        "low_sleep_avg_stress": round(mean(low), 1),
        "low_sleep_count": len(low),
        "high_sleep_avg_stress": round(mean(high), 1),
        "high_sleep_count": len(high),
    }


def get_current_streak(user, today=None):
    """Consecutive days with a check-in, walking backward from today.

    Plain count — explicitly no points, levels, or badges attached to it.
    If today's check-in hasn't been filled in yet, the streak still counts
    through yesterday (it isn't broken until a day is actually missed)."""
    today = today or timezone.localdate()
    checkin_dates = set(CheckIn.objects.filter(user=user).values_list("date", flat=True))
    cursor = today if today in checkin_dates else today - timedelta(days=1)
    streak = 0
    while cursor in checkin_dates:
        streak += 1
        cursor -= timedelta(days=1)
    return streak
