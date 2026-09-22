from django.conf import settings
from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone

from checkins.models import CheckIn

from .models import Group

User = get_user_model()


class JoinGroupTests(TestCase):
    def setUp(self):
        self.group = Group.objects.create(name="10А класс")
        self.user = User.objects.create_user(username="joiner", password="SuperSecret123!")
        self.client.login(username="joiner", password="SuperSecret123!")
        self.url = reverse("groups:join")

    def test_get_requires_login(self):
        self.client.logout()
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 302)

    def test_get_join_page_returns_200(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)

    def test_valid_code_sets_profile_group(self):
        response = self.client.post(self.url, {"invite_code": self.group.invite_code})
        self.assertEqual(response.status_code, 302)
        self.user.refresh_from_db()
        self.assertEqual(self.user.profile.group, self.group)

    def test_valid_code_is_case_insensitive(self):
        response = self.client.post(self.url, {"invite_code": self.group.invite_code.lower()})
        self.assertEqual(response.status_code, 302)
        self.user.refresh_from_db()
        self.assertEqual(self.user.profile.group, self.group)

    def test_invalid_code_does_not_set_group(self):
        response = self.client.post(self.url, {"invite_code": "NOPECODE"})
        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertIsNone(self.user.profile.group)
        self.assertTrue(response.context["form"].errors)


class OrgDashboardPrivacyThresholdTests(TestCase):
    """The core privacy requirement: aggregates only ever show at/above the
    configured minimum distinct weekly check-ins, never a partial/leaky view."""

    def setUp(self):
        self.group = Group.objects.create(name="Группа Б")
        self.viewer = User.objects.create_user(username="viewer", password="SuperSecret123!")
        self.viewer.profile.group = self.group
        self.viewer.profile.save()
        self.client.login(username="viewer", password="SuperSecret123!")
        self.url = reverse("groups:dashboard")
        self.min_required = settings.ORG_DASHBOARD_MIN_WEEKLY_CHECKINS

    def _add_checked_in_members(self, count, mood=3, energy=3, stress=3):
        today = timezone.localdate()
        for i in range(count):
            member = User.objects.create_user(username=f"member{i}", password="SuperSecret123!")
            member.profile.group = self.group
            member.profile.save()
            CheckIn.objects.create(
                user=member, date=today, mood=mood, energy=energy, stress=stress, sleep_hours=7,
            )

    def test_no_group_shows_join_prompt_not_aggregates(self):
        self.viewer.profile.group = None
        self.viewer.profile.save()
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        self.assertNotIn("aggregates", response.context)

    def test_below_threshold_shows_placeholder_message(self):
        self._add_checked_in_members(self.min_required - 1)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.context["has_enough_data"])
        self.assertContains(response, "Недостаточно данных")
        # No per-user data and no aggregate numbers should be present.
        self.assertNotIn("aggregates", response.context)
        for i in range(self.min_required - 1):
            self.assertNotContains(response, f"member{i}")

    def test_at_threshold_shows_real_aggregates(self):
        self._add_checked_in_members(self.min_required, mood=4, energy=3, stress=2)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.context["has_enough_data"])
        aggregates = response.context["aggregates"]
        self.assertEqual(aggregates["avg_mood"], 4)
        self.assertEqual(aggregates["avg_energy"], 3)
        self.assertEqual(aggregates["avg_stress"], 2)
        # Never a per-user breakdown in the rendered page.
        for i in range(self.min_required):
            self.assertNotContains(response, f"member{i}")

    def test_above_threshold_still_shows_aggregates(self):
        self._add_checked_in_members(self.min_required + 3)
        response = self.client.get(self.url)
        self.assertTrue(response.context["has_enough_data"])
        self.assertIn("aggregates", response.context)
