from datetime import timedelta

from django.test import TestCase
from django.urls import reverse
from django.utils import timezone

from accounts.models import User
from .models import CheckIn
from .services import (
    STATUS_ATTENTION,
    STATUS_COLLECTING,
    STATUS_OK,
    STATUS_SPECIALIST,
    get_burnout_status,
)


class SubmitCheckInTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="checker", password="SuperSecret123!")
        self.client.login(username="checker", password="SuperSecret123!")
        self.url = reverse("checkins:submit")

    def test_valid_post_creates_checkin(self):
        response = self.client.post(self.url, {
            "mood": 4,
            "energy": 3,
            "stress": 2,
            "sleep_hours": "7.5",
            "note": "Норм день",
        })
        self.assertEqual(response.status_code, 302)
        self.assertEqual(CheckIn.objects.count(), 1)
        checkin = CheckIn.objects.get(user=self.user)
        self.assertEqual(checkin.mood, 4)
        self.assertEqual(checkin.date, timezone.localdate())

    def test_second_post_same_day_updates_instead_of_duplicating(self):
        self.client.post(self.url, {
            "mood": 2, "energy": 2, "stress": 4, "sleep_hours": "5.5",
        })
        self.client.post(self.url, {
            "mood": 5, "energy": 5, "stress": 1, "sleep_hours": "8.5",
        })
        self.assertEqual(CheckIn.objects.count(), 1)
        self.assertEqual(CheckIn.objects.get(user=self.user).mood, 5)

    def test_anonymous_user_is_redirected_to_login(self):
        self.client.logout()
        response = self.client.post(self.url, {
            "mood": 4, "energy": 3, "stress": 2, "sleep_hours": "7.5",
        })
        self.assertEqual(response.status_code, 302)
        self.assertEqual(CheckIn.objects.count(), 0)

    def test_get_request_does_not_create_checkin(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 302)
        self.assertEqual(CheckIn.objects.count(), 0)

    def test_crisis_note_redirects_to_crisis_page_instead_of_saving_normally(self):
        response = self.client.post(self.url, {
            "mood": 1, "energy": 1, "stress": 5, "sleep_hours": "4.0",
            "note": "не хочу жить",
        })
        self.assertRedirects(response, reverse("safety:crisis"))
        self.assertEqual(CheckIn.objects.count(), 1)  # still saved — just routed differently


def _make_checkin(user, days_ago, mood, energy, stress, sleep_hours="7.0"):
    date = timezone.localdate() - timedelta(days=days_ago)
    return CheckIn.objects.create(
        user=user, date=date, mood=mood, energy=energy, stress=stress, sleep_hours=sleep_hours,
    )


class BurnoutStatusServiceTests(TestCase):
    """Covers checkins/services.py's baseline + sustained-decline detection.

    A consistent "good" baseline (mood=4, energy=4, stress=2 every day) is
    seeded far enough in the past that it's always the user's earliest
    BURNOUT_BASELINE_FULL_DAYS check-ins, then more recent days are added
    to test how the status reacts to them.
    """

    def setUp(self):
        self.user = User.objects.create_user(username="tracker", password="SuperSecret123!")

    def _seed_baseline(self, count=10, start_days_ago=20):
        for offset in range(count):
            _make_checkin(self.user, start_days_ago - offset, mood=4, energy=4, stress=2)

    def test_baseline_not_shown_with_fewer_than_min_days(self):
        self._seed_baseline(count=5, start_days_ago=10)  # < BURNOUT_BASELINE_MIN_DAYS (7)
        status, label, detail = get_burnout_status(self.user)
        self.assertEqual(status, STATUS_COLLECTING)
        self.assertEqual(label, "Собираем данные")
        self.assertEqual(detail, {})

    def test_single_bad_day_does_not_trigger_a_warning(self):
        self._seed_baseline()
        _make_checkin(self.user, days_ago=0, mood=1, energy=1, stress=5)  # today: one bad day

        status, _label, _detail = get_burnout_status(self.user)
        self.assertEqual(status, STATUS_OK)

    def test_three_consecutive_worsening_days_triggers_a_warning(self):
        self._seed_baseline()
        for days_ago in (2, 1, 0):  # three CONSECUTIVE bad days
            _make_checkin(self.user, days_ago=days_ago, mood=1, energy=1, stress=5)

        status, _label, detail = get_burnout_status(self.user)
        self.assertIn(status, (STATUS_ATTENTION, STATUS_SPECIALIST))
        self.assertEqual(detail["consecutive_decline_days"], 3)

    def test_non_consecutive_bad_days_do_not_trigger_a_warning(self):
        self._seed_baseline()
        # Bad days at days_ago 4 and 2 and 0, each separated by a good day —
        # never three CONSECUTIVE calendar days of decline.
        _make_checkin(self.user, days_ago=4, mood=1, energy=1, stress=5)
        _make_checkin(self.user, days_ago=3, mood=4, energy=4, stress=2)
        _make_checkin(self.user, days_ago=2, mood=1, energy=1, stress=5)
        _make_checkin(self.user, days_ago=1, mood=4, energy=4, stress=2)
        _make_checkin(self.user, days_ago=0, mood=1, energy=1, stress=5)

        status, _label, detail = get_burnout_status(self.user)
        self.assertEqual(status, STATUS_OK)
        self.assertEqual(detail["consecutive_decline_days"], 1)
