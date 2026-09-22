"""Tests for the "Мои данные" summary + deletion flow.

Kept in a separate module (rather than appended to tests.py) so it's easy to
tell apart from the pre-existing signup/profile tests.
"""
from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone

from assistant.models import Recommendation
from checkins.models import CheckIn
from events.models import Event
from groups.models import Group
from surveys.models import WeeklySurvey

User = get_user_model()


class MyDataSummaryTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="datauser", password="SuperSecret123!")
        self.client.login(username="datauser", password="SuperSecret123!")
        self.url = reverse("my_data")

    def test_requires_login(self):
        self.client.logout()
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 302)

    def test_get_returns_200(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)

    def test_summary_counts_are_accurate(self):
        today = timezone.localdate()
        CheckIn.objects.create(user=self.user, date=today, mood=3, energy=3, stress=3, sleep_hours=7)
        Event.objects.create(user=self.user, title="Экзамен", date=today, type="exam")
        WeeklySurvey.objects.create(
            user=self.user, date=today, q1=0, q2=0, q3=0, q4=0, q5=0, q6=0,
        )
        Recommendation.objects.create(user=self.user, date=today, text="Отдохни")

        response = self.client.get(self.url)
        self.assertEqual(response.context["checkin_count"], 1)
        self.assertEqual(response.context["event_count"], 1)
        self.assertEqual(response.context["survey_count"], 1)
        self.assertEqual(response.context["recommendation_count"], 1)


class MyDataDeletionTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="deluser", password="SuperSecret123!")
        self.client.login(username="deluser", password="SuperSecret123!")
        self.confirm_url = reverse("my_data_delete")

        today = timezone.localdate()
        self.group = Group.objects.create(name="Группа del")
        self.user.profile.group = self.group
        self.user.profile.nickname = "Ник"
        self.user.profile.save()

        CheckIn.objects.create(user=self.user, date=today, mood=3, energy=3, stress=3, sleep_hours=7)
        Event.objects.create(user=self.user, title="Дедлайн", date=today, type="deadline")
        WeeklySurvey.objects.create(
            user=self.user, date=today, q1=0, q2=0, q3=0, q4=0, q5=0, q6=0,
        )
        Recommendation.objects.create(user=self.user, date=today, text="Отдохни")

    def test_get_shows_confirmation_page_without_deleting(self):
        response = self.client.get(self.confirm_url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(CheckIn.objects.filter(user=self.user).count(), 1)

    def test_post_deletes_all_tracked_data(self):
        response = self.client.post(self.confirm_url)
        self.assertEqual(response.status_code, 302)

        self.assertEqual(CheckIn.objects.filter(user=self.user).count(), 0)
        self.assertEqual(Event.objects.filter(user=self.user).count(), 0)
        self.assertEqual(WeeklySurvey.objects.filter(user=self.user).count(), 0)
        self.assertEqual(Recommendation.objects.filter(user=self.user).count(), 0)

        self.user.profile.refresh_from_db()
        self.assertIsNone(self.user.profile.group)
        self.assertEqual(self.user.profile.nickname, "")

    def test_account_still_exists_and_can_log_in_after_deletion(self):
        self.client.post(self.confirm_url)

        self.assertTrue(User.objects.filter(username="deluser").exists())

        self.client.logout()
        logged_in = self.client.login(username="deluser", password="SuperSecret123!")
        self.assertTrue(logged_in)

        response = self.client.get(reverse("my_data"))
        self.assertEqual(response.status_code, 200)
