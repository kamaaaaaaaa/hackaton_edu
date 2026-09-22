from django.test import TestCase
from django.urls import reverse

from accounts.models import User
from checkins.models import CheckIn


class HomePageTests(TestCase):
    def test_home_page_returns_200(self):
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)

    def test_home_page_uses_correct_template(self):
        response = self.client.get("/")
        self.assertTemplateUsed(response, "core/home.html")

    def test_home_url_reverses_correctly(self):
        self.assertEqual(reverse("core:home"), "/")

    def test_anonymous_visitor_sees_login_prompt_not_checkin_form(self):
        response = self.client.get("/")
        self.assertContains(response, "Войти, чтобы начать")
        self.assertNotContains(response, 'id="checkin-form"')

    def test_authenticated_user_without_checkin_sees_form(self):
        User.objects.create_user(username="visitor", password="SuperSecret123!")
        self.client.login(username="visitor", password="SuperSecret123!")
        response = self.client.get("/")
        self.assertContains(response, "Как ты сегодня?")
        self.assertContains(response, 'id="checkin-form"')

    def test_authenticated_user_with_todays_checkin_sees_confirmation(self):
        from django.utils import timezone
        user = User.objects.create_user(username="doneuser", password="SuperSecret123!")
        CheckIn.objects.create(
            user=user, date=timezone.localdate(),
            mood=4, energy=3, stress=2, sleep_hours="7.5",
        )
        self.client.login(username="doneuser", password="SuperSecret123!")
        response = self.client.get("/")
        self.assertContains(response, "Отметка на сегодня сохранена")


class ProgressPageTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="grower", password="SuperSecret123!")
        self.client.login(username="grower", password="SuperSecret123!")
        self.url = reverse("core:progress")

    def test_anonymous_user_is_redirected_to_login(self):
        self.client.logout()
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 302)

    def test_no_checkins_yet_shows_empty_state_not_charts(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        self.assertNotContains(response, 'id="chart-14"')

    def test_with_checkins_shows_charts_and_streak(self):
        from datetime import timedelta
        from django.utils import timezone
        today = timezone.localdate()
        for offset in range(5):
            CheckIn.objects.create(
                user=self.user, date=today - timedelta(days=offset),
                mood=4, energy=3, stress=2, sleep_hours="7.0",
            )
        response = self.client.get(self.url)
        self.assertContains(response, 'id="chart-14"')
        self.assertContains(response, "chart.js")
        self.assertContains(response, "5")  # streak of 5 consecutive days

    def test_sleep_pattern_hidden_without_enough_data_on_both_sides(self):
        from datetime import timedelta
        from django.utils import timezone
        today = timezone.localdate()
        # Only 2 low-sleep nights — below the >=3-each-side requirement.
        for offset, sleep in enumerate(["5.0", "5.5", "7.0", "7.5", "8.0"]):
            CheckIn.objects.create(
                user=self.user, date=today - timedelta(days=offset),
                mood=3, energy=3, stress=3, sleep_hours=sleep,
            )
        response = self.client.get(self.url)
        self.assertNotContains(response, "Личный паттерн")

    def test_sleep_pattern_shown_with_enough_data_on_both_sides(self):
        from datetime import timedelta
        from django.utils import timezone
        today = timezone.localdate()
        sleeps = ["4.0", "4.5", "5.0", "7.0", "7.5", "8.0"]  # 3 low, 3 high
        for offset, sleep in enumerate(sleeps):
            CheckIn.objects.create(
                user=self.user, date=today - timedelta(days=offset),
                mood=3, energy=3, stress=3, sleep_hours=sleep,
            )
        response = self.client.get(self.url)
        self.assertContains(response, "Личный паттерн")
