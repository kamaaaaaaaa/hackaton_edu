from django.test import TestCase
from django.urls import reverse

from .models import User


class SignupViewTests(TestCase):
    def setUp(self):
        self.url = reverse("signup")

    def test_get_signup_page_returns_200(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)

    def test_valid_post_creates_user_logs_in_and_redirects(self):
        response = self.client.post(
            self.url,
            {
                "username": "newuser",
                "email": "newuser@example.com",
                "password1": "SuperSecret123!",
                "password2": "SuperSecret123!",
            },
        )
        self.assertEqual(response.status_code, 302)
        self.assertTrue(User.objects.filter(username="newuser").exists())
        # The new user should be logged in for the following request.
        response = self.client.get(reverse("core:home"))
        self.assertTrue(response.wsgi_request.user.is_authenticated)
        self.assertEqual(response.wsgi_request.user.username, "newuser")

    def test_mismatched_passwords_does_not_create_user(self):
        response = self.client.post(
            self.url,
            {
                "username": "baduser",
                "email": "baduser@example.com",
                "password1": "SuperSecret123!",
                "password2": "DifferentPassword!",
            },
        )
        self.assertEqual(response.status_code, 200)
        self.assertFalse(User.objects.filter(username="baduser").exists())
        self.assertTrue(response.context["form"].errors)

    def test_weak_password_does_not_create_user(self):
        response = self.client.post(
            self.url,
            {
                "username": "weakuser",
                "email": "weakuser@example.com",
                "password1": "12345678",
                "password2": "12345678",
            },
        )
        self.assertEqual(response.status_code, 200)
        self.assertFalse(User.objects.filter(username="weakuser").exists())
        self.assertTrue(response.context["form"].errors)

    def test_duplicate_username_is_rejected(self):
        User.objects.create_user(
            username="existinguser",
            email="existing@example.com",
            password="SuperSecret123!",
        )
        response = self.client.post(
            self.url,
            {
                "username": "existinguser",
                "email": "another@example.com",
                "password1": "SuperSecret123!",
                "password2": "SuperSecret123!",
            },
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(User.objects.filter(username="existinguser").count(), 1)
        self.assertTrue(response.context["form"].errors)
