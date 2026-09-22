"""Load-calendar forecast: how many days ahead to warn before a new event.

For each of this user's PAST events of the same type, scan backward from
that event's date through their check-ins and count the trailing run of
consecutive days where stress was already elevated above their personal
baseline (see checkins/services.py — same "compare only to your own
normal" principle as the burnout status). That run's length is "how many
days ahead stress typically started rising before events of this type."
Average that across past events that show a detectable rise.

With no baseline yet, or no past events of this type with a detectable
rise, fall back to EVENT_FORECAST_DEFAULT_DAYS — the same conservative
default used everywhere else in the product.
"""
from datetime import timedelta

from django.conf import settings
from django.utils import timezone

from checkins.models import CheckIn
from checkins.services import get_baseline

from .models import Event

# How far back to look for a stress rise before a past event. Generous but
# bounded — a rise more than 3 weeks ahead of an exam wouldn't plausibly be
# "about that exam" anyway.
LOOKBACK_DAYS = 21


def _lead_days_for_event(user, event, baseline):
    """Trailing run of consecutive days right before `event.date` where
    stress was at/above baseline (mean + a margin, floored so an
    almost-zero stdev doesn't make the threshold meaninglessly tight).
    None if no such run is found in the lookback window."""
    threshold = baseline.stress_mean + max(baseline.stress_stdev, 0.5)
    window_start = event.date - timedelta(days=LOOKBACK_DAYS)
    checkins_by_date = {
        c.date: c
        for c in CheckIn.objects.filter(user=user, date__gte=window_start, date__lt=event.date)
    }

    lead_days = 0
    day = event.date - timedelta(days=1)
    while day >= window_start:
        checkin = checkins_by_date.get(day)
        if checkin is None or checkin.stress < threshold:
            break
        lead_days += 1
        day -= timedelta(days=1)
    return lead_days if lead_days > 0 else None


def forecast_heads_up_days(user, event_type):
    """How many days before an event of `event_type` this user's stress has
    historically started rising — or EVENT_FORECAST_DEFAULT_DAYS if there's
    no usable history yet."""
    baseline = get_baseline(user)
    if baseline is None:
        return settings.EVENT_FORECAST_DEFAULT_DAYS

    past_events = Event.objects.filter(
        user=user, type=event_type, date__lt=timezone.localdate()
    )
    samples = [
        lead for lead in (_lead_days_for_event(user, event, baseline) for event in past_events)
        if lead is not None
    ]
    if not samples:
        return settings.EVENT_FORECAST_DEFAULT_DAYS
    return round(sum(samples) / len(samples))
