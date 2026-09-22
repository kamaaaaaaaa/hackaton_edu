from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone

from .models import WeeklySurvey
from .services import due_for_survey, interpret_score

User = get_user_model()


class WeeklySurveyScoringTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="scoring", password="SuperSecret123!")

    def test_compute_score_is_average_of_six_answers(self):
        survey = WeeklySurvey.objects.create(
            user=self.user, date=timezone.localdate(),
            q1=100, q2=100, q3=100, q4=100, q5=100, q6=100,
        )
        self.assertEqual(float(survey.score), 100.0)

    def test_compute_score_mixed_answers(self):
        # 0 + 25 + 50 + 75 + 100 + 50 = 300 / 6 = 50
        survey = WeeklySurvey.objects.create(
            user=self.user, date=timezone.localdate(),
            q1=0, q2=25, q3=50, q4=75, q5=100, q6=50,
        )
        self.assertEqual(float(survey.score), 50.0)

    def test_compute_score_all_zero(self):
        survey = WeeklySurvey.objects.create(
            user=self.user, date=timezone.localdate(),
            q1=0, q2=0, q3=0, q4=0, q5=0, q6=0,
        )
        self.assertEqual(float(survey.score), 0.0)

    def test_interpret_score_bands(self):
        self.assertIn("Низкий", interpret_score(0))
        self.assertIn("Средний", interpret_score(30))
        self.assertIn("Повышенный", interpret_score(60))
        self.assertIn("Высокий", interpret_score(90))


class DueForSurveyTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="dueuser", password="SuperSecret123!")

    def test_due_when_no_survey_yet(self):
        self.assertTrue(due_for_survey(self.user))

    def test_not_due_right_after_taking(self):
        WeeklySurvey.objects.create(
            user=self.user, date=timezone.localdate(),
            q1=0, q2=0, q3=0, q4=0, q5=0, q6=0,
        )
        self.assertFalse(due_for_survey(self.user))

    def test_due_after_interval_passes(self):
        old_date = timezone.localdate() - timedelta(days=30)
        WeeklySurvey.objects.create(
            user=self.user, date=old_date,
            q1=0, q2=0, q3=0, q4=0, q5=0, q6=0,
        )
        self.assertTrue(due_for_survey(self.user))


class SurveyFormViewTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="formuser", password="SuperSecret123!")
        self.client.login(username="formuser", password="SuperSecret123!")
        self.url = reverse("surveys:form")

    def test_get_requires_login(self):
        self.client.logout()
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 302)

    def test_get_form_returns_200(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)

    def test_valid_post_creates_survey_and_redirects_to_result(self):
        response = self.client.post(self.url, {
            "q1": 100, "q2": 75, "q3": 50, "q4": 25, "q5": 0, "q6": 50,
        })
        self.assertEqual(response.status_code, 302)
        survey = WeeklySurvey.objects.get(user=self.user)
        # (100+75+50+25+0+50)/6 = 50
        self.assertEqual(float(survey.score), 50.0)
        self.assertEqual(survey.date, timezone.localdate())

    def test_incomplete_post_does_not_create_survey(self):
        response = self.client.post(self.url, {"q1": 100})
        self.assertEqual(response.status_code, 200)
        self.assertFalse(WeeklySurvey.objects.filter(user=self.user).exists())

    def test_result_page_only_visible_to_owner(self):
        survey = WeeklySurvey.objects.create(
            user=self.user, date=timezone.localdate(),
            q1=0, q2=0, q3=0, q4=0, q5=0, q6=0,
        )
        response = self.client.get(reverse("surveys:result", args=[survey.pk]))
        self.assertEqual(response.status_code, 200)

        other = User.objects.create_user(username="otheruser", password="SuperSecret123!")
        self.client.logout()
        self.client.login(username="otheruser", password="SuperSecret123!")
        response = self.client.get(reverse("surveys:result", args=[survey.pk]))
        self.assertEqual(response.status_code, 404)


class HomeSurveyBannerTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="banneruser", password="SuperSecret123!")
        self.client.login(username="banneruser", password="SuperSecret123!")

    def test_banner_shown_when_due(self):
        response = self.client.get(reverse("core:home"))
        self.assertContains(response, "Еженедельный опросник")

    def test_banner_hidden_when_not_due(self):
        WeeklySurvey.objects.create(
            user=self.user, date=timezone.localdate(),
            q1=0, q2=0, q3=0, q4=0, q5=0, q6=0,
        )
        response = self.client.get(reverse("core:home"))
        self.assertNotContains(response, "survey-reminder")
