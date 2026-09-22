from django.test import TestCase
from django.urls import reverse
from django.utils import timezone

from accounts.models import User
from .models import CheckIn


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
