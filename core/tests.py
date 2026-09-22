from django.test import TestCase
from django.urls import reverse


class HomePageTests(TestCase):
    def test_home_page_returns_200(self):
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)

    def test_home_page_uses_correct_template(self):
        response = self.client.get("/")
        self.assertTemplateUsed(response, "core/home.html")

    def test_home_url_reverses_correctly(self):
        self.assertEqual(reverse("core:home"), "/")
