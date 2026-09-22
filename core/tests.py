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
