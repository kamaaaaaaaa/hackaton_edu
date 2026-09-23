from django.test import TestCase
from django.urls import reverse


class SpaServingTests(TestCase):
    def test_home_page_returns_200(self):
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        self.assertIn(b"<div id=\"root\">", response.content)

    def test_home_url_reverses_correctly(self):
        self.assertEqual(reverse("core:home"), "/")

    def test_client_side_route_falls_back_to_spa_shell(self):
        # /map, /family, /checklist etc. are React Router routes with no
        # matching Django urlpattern of their own — the catch-all must
        # still serve the same index.html so a hard refresh doesn't 404.
        response = self.client.get("/map")
        self.assertEqual(response.status_code, 200)
        self.assertIn(b"<div id=\"root\">", response.content)

    def test_admin_still_reachable_through_the_catch_all(self):
        response = self.client.get("/admin/")
        self.assertEqual(response.status_code, 302)

    def test_api_still_reachable_through_the_catch_all(self):
        response = self.client.get("/api/analytics/summary/")
        self.assertEqual(response.status_code, 200)
