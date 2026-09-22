from django.test import TestCase
from django.urls import reverse

from .crisis_contacts import CRISIS_CONTACTS


class QuickHelpViewTests(TestCase):
    def test_quick_help_page_ok(self):
        response = self.client.get(reverse("safety:quick_help"))
        self.assertEqual(response.status_code, 200)

    def test_quick_help_shows_breathing_exercise(self):
        response = self.client.get(reverse("safety:quick_help"))
        self.assertContains(response, "Квадратное дыхание")
        self.assertContains(response, "id=\"breathingCircle\"")

    def test_quick_help_shows_pause_section(self):
        response = self.client.get(reverse("safety:quick_help"))
        self.assertContains(response, "5 минут на паузу")

    def test_quick_help_shows_contacts(self):
        response = self.client.get(reverse("safety:quick_help"))
        for contact in CRISIS_CONTACTS:
            self.assertContains(response, contact["name"])


class CrisisViewTests(TestCase):
    def test_crisis_page_ok(self):
        response = self.client.get(reverse("safety:crisis"))
        self.assertEqual(response.status_code, 200)

    def test_crisis_page_shows_contacts(self):
        response = self.client.get(reverse("safety:crisis"))
        for contact in CRISIS_CONTACTS:
            self.assertContains(response, contact["name"])

    def test_crisis_page_links_to_breathing_exercise(self):
        response = self.client.get(reverse("safety:crisis"))
        self.assertContains(response, reverse("safety:quick_help"))
