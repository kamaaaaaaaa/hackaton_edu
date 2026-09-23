import json

from django.contrib.auth import get_user_model
from django.test import TestCase

from authapi.models import AuthToken

from .models import AnalyticsEvent

User = get_user_model()


class TrackTests(TestCase):
    def setUp(self):
        self.url = '/api/analytics/track/'

    def test_track_with_valid_event_returns_201(self):
        response = self.client.post(
            self.url,
            data=json.dumps({'event': 'house_checked', 'meta': {'houseId': 7}}),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json(), {'ok': True})

        event = AnalyticsEvent.objects.get()
        self.assertEqual(event.event_type, 'house_checked')
        self.assertEqual(event.meta, {'houseId': 7})

    def test_track_without_meta_defaults_to_empty_dict(self):
        response = self.client.post(
            self.url,
            data=json.dumps({'event': 'app_opened'}),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 201)
        event = AnalyticsEvent.objects.get()
        self.assertEqual(event.meta, {})

    def test_track_with_blank_event_returns_400(self):
        response = self.client.post(
            self.url,
            data=json.dumps({'event': '   '}),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(AnalyticsEvent.objects.count(), 0)

    def test_track_with_missing_event_returns_400(self):
        response = self.client.post(
            self.url,
            data=json.dumps({}),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 400)

    def test_track_with_malformed_json_returns_400_not_500(self):
        response = self.client.post(self.url, data='{bad json', content_type='application/json')
        self.assertEqual(response.status_code, 400)


class SummaryTests(TestCase):
    def setUp(self):
        self.url = '/api/analytics/summary/'
        self.staff_user = User.objects.create_user(
            username='staffuser', password='a-strong-passphrase-42', is_staff=True
        )
        self.staff_token = AuthToken.objects.create(user=self.staff_user)
        self.staff_header = {'HTTP_AUTHORIZATION': f'Token {self.staff_token.key}'}

        self.regular_user = User.objects.create_user(
            username='regularuser', password='a-strong-passphrase-42'
        )
        self.regular_token = AuthToken.objects.create(user=self.regular_user)
        self.regular_header = {'HTTP_AUTHORIZATION': f'Token {self.regular_token.key}'}

    def test_summary_reflects_tracked_events(self):
        AnalyticsEvent.objects.create(event_type='house_checked', meta={})
        AnalyticsEvent.objects.create(event_type='house_checked', meta={})
        AnalyticsEvent.objects.create(event_type='app_opened', meta={})

        response = self.client.get(self.url, **self.staff_header)
        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertEqual(data['totalEvents'], 3)
        self.assertEqual(data['byEventType'], {'house_checked': 2, 'app_opened': 1})
        self.assertEqual(data['last24h'], 3)
        self.assertIn('generatedAt', data)

    def test_summary_with_no_events_returns_zeros(self):
        response = self.client.get(self.url, **self.staff_header)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['totalEvents'], 0)
        self.assertEqual(data['byEventType'], {})
        self.assertEqual(data['last24h'], 0)

    def test_summary_with_missing_token_returns_401(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 401)
        self.assertIn('error', response.json())

    def test_summary_with_garbage_token_returns_401(self):
        response = self.client.get(self.url, HTTP_AUTHORIZATION='Token not-a-real-token')
        self.assertEqual(response.status_code, 401)
        self.assertIn('error', response.json())

    def test_summary_with_non_staff_token_returns_403(self):
        response = self.client.get(self.url, **self.regular_header)
        self.assertEqual(response.status_code, 403)
        self.assertIn('error', response.json())
