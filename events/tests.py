from datetime import timedelta

from django.conf import settings
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone

from accounts.models import User
from checkins.models import CheckIn

from .models import Event
from .services import forecast_heads_up_days


def _make_checkin(user, date, mood, energy, stress, sleep_hours="7.0"):
    return CheckIn.objects.create(
        user=user, date=date, mood=mood, energy=energy, stress=stress, sleep_hours=sleep_hours,
    )


class ForecastServiceTests(TestCase):
    """Covers events/services.py's forecast_heads_up_days: with-history and
    no-history cases, using checkins.services' baseline underneath."""

    def setUp(self):
        self.user = User.objects.create_user(username="planner", password="SuperSecret123!")

    def _seed_baseline(self, anchor, count=10):
        """A steady, calm baseline (mood=4, energy=4, stress=2) for `count`
        days ending well before `anchor`, so it's always the user's earliest
        check-ins and stays untouched by whatever comes after."""
        for offset in range(count):
            date = anchor - timedelta(days=40 - offset)
            _make_checkin(self.user, date, mood=4, energy=4, stress=2)

    def test_no_history_falls_back_to_default_forecast_days(self):
        today = timezone.localdate()
        self._seed_baseline(today)
        # No past events of this type at all.
        forecast = forecast_heads_up_days(self.user, "exam")
        self.assertEqual(forecast, settings.EVENT_FORECAST_DEFAULT_DAYS)

    def test_no_baseline_falls_back_to_default_forecast_days(self):
        # Fewer than BURNOUT_BASELINE_MIN_DAYS check-ins at all — no baseline.
        forecast = forecast_heads_up_days(self.user, "exam")
        self.assertEqual(forecast, settings.EVENT_FORECAST_DEFAULT_DAYS)

    def test_past_event_history_produces_a_specific_forecast(self):
        today = timezone.localdate()
        self._seed_baseline(today)

        # A past exam, with stress visibly elevated for the 4 days before it.
        past_exam_date = today - timedelta(days=5)
        Event.objects.create(user=self.user, title="Прошлый экзамен", date=past_exam_date, type="exam")
        for days_before in (4, 3, 2, 1):
            _make_checkin(
                self.user, past_exam_date - timedelta(days=days_before),
                mood=2, energy=2, stress=5,
            )

        forecast = forecast_heads_up_days(self.user, "exam")
        self.assertEqual(forecast, 4)
        # A different event type with no history still falls back to default.
        self.assertEqual(
            forecast_heads_up_days(self.user, "deadline"), settings.EVENT_FORECAST_DEFAULT_DAYS,
        )


class EventsPageTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="scheduler", password="SuperSecret123!")
        self.client.login(username="scheduler", password="SuperSecret123!")
        self.url = reverse("events:index")

    def test_page_returns_200_for_logged_in_user(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)

    def test_anonymous_user_is_redirected_to_login(self):
        self.client.logout()
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 302)

    def test_valid_post_creates_event_and_redirects(self):
        future_date = timezone.localdate() + timedelta(days=10)
        response = self.client.post(self.url, {
            "title": "Экзамен по матанализу",
            "date": future_date.isoformat(),
            "type": "exam",
        })
        self.assertRedirects(response, self.url)
        self.assertEqual(Event.objects.filter(user=self.user).count(), 1)

    def test_past_date_is_rejected(self):
        past_date = timezone.localdate() - timedelta(days=1)
        response = self.client.post(self.url, {
            "title": "Просроченное событие",
            "date": past_date.isoformat(),
            "type": "other",
        })
        self.assertEqual(response.status_code, 200)  # re-renders with form errors
        self.assertEqual(Event.objects.count(), 0)

    def test_upcoming_events_list_shows_only_this_users_future_events(self):
        other_user = User.objects.create_user(username="stranger", password="SuperSecret123!")
        future_date = timezone.localdate() + timedelta(days=3)
        Event.objects.create(user=self.user, title="Мой дедлайн", date=future_date, type="deadline")
        Event.objects.create(user=other_user, title="Чужой дедлайн", date=future_date, type="deadline")

        response = self.client.get(self.url)
        self.assertContains(response, "Мой дедлайн")
        self.assertNotContains(response, "Чужой дедлайн")
