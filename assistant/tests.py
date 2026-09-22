from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils import timezone

from articles.models import Article
from checkins.models import CheckIn
from events.models import Event

from .models import Recommendation
from .services import get_todays_recommendations, parse_ai_recommendations

User = get_user_model()


class FallbackRecommendationsTests(TestCase):
    """Primary verification path: no ANTHROPIC_API_KEY configured (dev default)."""

    def setUp(self):
        self.user = User.objects.create_user(username="alina", password="pass12345")
        self.today = timezone.localdate()

        Article.objects.create(
            title="Как выспаться перед экзаменом",
            category="sleep",
            body="...",
        )
        Article.objects.create(
            title="Дыхательные практики против стресса",
            category="stress_burnout",
            body="...",
        )

    @override_settings(ANTHROPIC_API_KEY="")
    def test_low_sleep_generates_sensible_non_generic_recommendation(self):
        for i in range(4):
            CheckIn.objects.create(
                user=self.user,
                date=self.today - timedelta(days=i + 1),
                mood=3, energy=3, stress=3,
                sleep_hours=4.5,
            )

        recs = get_todays_recommendations(self.user)

        self.assertTrue(1 <= len(recs) <= 3)
        self.assertTrue(all(isinstance(r, Recommendation) for r in recs))
        texts = [r.text for r in recs]
        self.assertTrue(any("спать" in t.lower() or "сон" in t.lower() for t in texts))
        # The sleep tip should be linked to the sleep-category article.
        sleep_rec = next(r for r in recs if "спать" in r.text.lower() or "сон" in r.text.lower())
        self.assertIsNotNone(sleep_rec.article)
        self.assertEqual(sleep_rec.article.category, "sleep")
        self.assertTrue(sleep_rec.why_explanation)

    @override_settings(ANTHROPIC_API_KEY="")
    def test_high_stress_generates_breathing_recommendation(self):
        for i in range(3):
            CheckIn.objects.create(
                user=self.user,
                date=self.today - timedelta(days=i + 1),
                mood=3, energy=3, stress=5,
                sleep_hours=7.5,
            )

        recs = get_todays_recommendations(self.user)
        texts = " ".join(r.text.lower() for r in recs)
        self.assertTrue("дыхат" in texts or "паузу" in texts)

    @override_settings(ANTHROPIC_API_KEY="")
    def test_low_mood_generates_supportive_recommendation(self):
        for i in range(3):
            CheckIn.objects.create(
                user=self.user,
                date=self.today - timedelta(days=i + 1),
                mood=1, energy=3, stress=2,
                sleep_hours=7.5,
            )

        recs = get_todays_recommendations(self.user)
        texts = " ".join(r.text.lower() for r in recs)
        self.assertTrue("близк" in texts or "поговор" in texts or "позвон" in texts)

    @override_settings(ANTHROPIC_API_KEY="")
    def test_no_checkins_still_returns_varied_non_crashing_default(self):
        recs = get_todays_recommendations(self.user)
        self.assertTrue(1 <= len(recs) <= 3)
        self.assertTrue(all(r.text for r in recs))

    @override_settings(ANTHROPIC_API_KEY="")
    def test_upcoming_event_generates_planning_recommendation(self):
        Event.objects.create(
            user=self.user, title="Экзамен по химии",
            date=self.today + timedelta(days=2), type="exam",
        )
        recs = get_todays_recommendations(self.user)
        texts = " ".join(r.text for r in recs)
        self.assertIn("Экзамен по химии", texts)

    @override_settings(ANTHROPIC_API_KEY="")
    def test_second_call_same_day_returns_cached_results_no_duplicates(self):
        first = get_todays_recommendations(self.user)
        first_ids = sorted(r.id for r in first)

        second = get_todays_recommendations(self.user)
        second_ids = sorted(r.id for r in second)

        self.assertEqual(first_ids, second_ids)
        self.assertEqual(
            Recommendation.objects.filter(user=self.user, date=self.today).count(),
            len(first),
        )

    @override_settings(ANTHROPIC_API_KEY="sk-ant-fake-key-for-test")
    @patch("assistant.services._call_ai")
    def test_api_key_configured_but_call_fails_falls_back(self, mock_call_ai):
        mock_call_ai.return_value = None  # simulates any failure inside _call_ai
        recs = get_todays_recommendations(self.user)
        self.assertTrue(1 <= len(recs) <= 3)
        mock_call_ai.assert_called_once()


class ParseAIRecommendationsTests(TestCase):
    """Unit tests for the defensive JSON parser — must never raise."""

    def test_valid_json_parses_and_validates_article_id(self):
        raw = '[{"text": "Сделай паузу", "why_explanation": "Стресс выше нормы", "article_id": 5}]'
        result = parse_ai_recommendations(raw, valid_article_ids={5, 7})
        self.assertEqual(result, [
            {"text": "Сделай паузу", "why_explanation": "Стресс выше нормы", "article_id": 5}
        ])

    def test_article_id_not_in_valid_set_becomes_none(self):
        raw = '[{"text": "Сделай паузу", "why_explanation": "...", "article_id": 999}]'
        result = parse_ai_recommendations(raw, valid_article_ids={5, 7})
        self.assertEqual(result[0]["article_id"], None)

    def test_strips_markdown_code_fence(self):
        raw = '```json\n[{"text": "Отдохни", "why_explanation": "...", "article_id": null}]\n```'
        result = parse_ai_recommendations(raw, valid_article_ids=set())
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["text"], "Отдохни")

    def test_malformed_json_returns_none_not_raise(self):
        raw = '{not valid json at all [[['
        result = parse_ai_recommendations(raw, valid_article_ids=set())
        self.assertIsNone(result)

    def test_empty_string_returns_none(self):
        self.assertIsNone(parse_ai_recommendations("", valid_article_ids=set()))
        self.assertIsNone(parse_ai_recommendations("   ", valid_article_ids=set()))

    def test_non_list_json_returns_none(self):
        raw = '{"text": "Отдохни"}'
        self.assertIsNone(parse_ai_recommendations(raw, valid_article_ids=set()))

    def test_too_many_items_returns_none(self):
        raw = '[{"text": "a", "why_explanation": "", "article_id": null}] ' * 1  # base
        raw = "[" + ",".join(['{"text": "a", "why_explanation": "", "article_id": null}'] * 4) + "]"
        self.assertIsNone(parse_ai_recommendations(raw, valid_article_ids=set()))

    def test_missing_text_field_returns_none(self):
        raw = '[{"why_explanation": "...", "article_id": null}]'
        self.assertIsNone(parse_ai_recommendations(raw, valid_article_ids=set()))

    def test_item_not_a_dict_returns_none(self):
        raw = '["just a string"]'
        self.assertIsNone(parse_ai_recommendations(raw, valid_article_ids=set()))


class FeedbackViewTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="dima", password="pass12345")
        self.other = User.objects.create_user(username="other", password="pass12345")
        self.rec = Recommendation.objects.create(
            user=self.user, date=timezone.localdate(), text="Сделай паузу",
        )

    def test_requires_login(self):
        url = reverse("assistant:feedback", args=[self.rec.id])
        response = self.client.post(url, {"feedback": "helped"})
        self.assertEqual(response.status_code, 302)  # redirected to login

    def test_marks_feedback_and_redirects(self):
        self.client.login(username="dima", password="pass12345")
        url = reverse("assistant:feedback", args=[self.rec.id])
        response = self.client.post(url, {"feedback": "helped"})
        self.rec.refresh_from_db()
        self.assertEqual(self.rec.feedback, "helped")
        self.assertEqual(response.status_code, 302)

    def test_cannot_mark_another_users_recommendation(self):
        self.client.login(username="other", password="pass12345")
        url = reverse("assistant:feedback", args=[self.rec.id])
        response = self.client.post(url, {"feedback": "helped"})
        self.assertEqual(response.status_code, 404)
        self.rec.refresh_from_db()
        self.assertEqual(self.rec.feedback, "none")

    def test_invalid_feedback_value_ignored(self):
        self.client.login(username="dima", password="pass12345")
        url = reverse("assistant:feedback", args=[self.rec.id])
        self.client.post(url, {"feedback": "bogus"})
        self.rec.refresh_from_db()
        self.assertEqual(self.rec.feedback, "none")
