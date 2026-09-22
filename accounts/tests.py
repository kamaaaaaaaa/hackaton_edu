from django.test import TestCase
from django.urls import reverse

from .models import Profile, User


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
                "user_type": "student",
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
                "user_type": "student",
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
                "user_type": "student",
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
                "user_type": "student",
            },
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(User.objects.filter(username="existinguser").count(), 1)
        self.assertTrue(response.context["form"].errors)


class SignupUserTypeTests(TestCase):
    """user_type + parental_consent behavior (AntiВыгорание step 5)."""

    def setUp(self):
        self.url = reverse("signup")

    def _post(self, username, user_type, parental_consent=None):
        data = {
            "username": username,
            "email": f"{username}@example.com",
            "password1": "SuperSecret123!",
            "password2": "SuperSecret123!",
            "user_type": user_type,
        }
        if parental_consent:
            data["parental_consent"] = "on"
        return self.client.post(self.url, data)

    def test_schoolchild_without_consent_is_rejected(self):
        response = self._post("kiduser", "schoolchild")
        self.assertEqual(response.status_code, 200)
        self.assertFalse(User.objects.filter(username="kiduser").exists())
        self.assertIn("parental_consent", response.context["form"].errors)

    def test_schoolchild_with_consent_is_accepted(self):
        response = self._post("kidconsented", "schoolchild", parental_consent=True)
        self.assertEqual(response.status_code, 302)
        user = User.objects.get(username="kidconsented")
        self.assertEqual(user.profile.user_type, "schoolchild")
        self.assertTrue(user.profile.parental_consent)

    def test_student_signup_unaffected_by_new_field(self):
        response = self._post("studentuser", "student")
        self.assertEqual(response.status_code, 302)
        user = User.objects.get(username="studentuser")
        self.assertEqual(user.profile.user_type, "student")
        self.assertFalse(user.profile.parental_consent)

    def test_adult_signup_unaffected_by_new_field(self):
        response = self._post("adultuser", "adult")
        self.assertEqual(response.status_code, 302)
        user = User.objects.get(username="adultuser")
        self.assertEqual(user.profile.user_type, "adult")
        self.assertFalse(user.profile.parental_consent)


class ProfileSignalTests(TestCase):
    def test_profile_auto_created_for_new_user(self):
        user = User.objects.create_user(username="plainuser", password="SuperSecret123!")
        self.assertTrue(Profile.objects.filter(user=user).exists())
