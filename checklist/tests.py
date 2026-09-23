import json

from django.contrib.auth import get_user_model
from django.test import TestCase

from authapi.models import AuthToken

from .models import ChecklistProgress

User = get_user_model()


class ChecklistGetTests(TestCase):
    def setUp(self):
        self.url = '/api/checklist/'
        self.user = User.objects.create_user(username='checklistuser', password='a-strong-passphrase-42')
        self.token = AuthToken.objects.create(user=self.user)

    def test_get_with_no_row_yet_returns_empty_checked_and_null_updated_at(self):
        response = self.client.get(self.url, HTTP_AUTHORIZATION=f'Token {self.token.key}')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {'checked': {}, 'updatedAt': None})

    def test_get_with_existing_row_returns_checked_and_iso_updated_at(self):
        ChecklistProgress.objects.create(user=self.user, checked={'water': True, 'food': True})
        response = self.client.get(self.url, HTTP_AUTHORIZATION=f'Token {self.token.key}')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['checked'], {'water': True, 'food': True})
        self.assertIsNotNone(data['updatedAt'])
        self.assertTrue(data['updatedAt'].endswith('Z'))

    def test_get_with_missing_token_returns_401(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 401)
        self.assertIn('error', response.json())

    def test_get_with_garbage_token_returns_401(self):
        response = self.client.get(self.url, HTTP_AUTHORIZATION='Token not-a-real-token')
        self.assertEqual(response.status_code, 401)
        self.assertIn('error', response.json())


class ChecklistPatchTests(TestCase):
    def setUp(self):
        self.url = '/api/checklist/'
        self.user = User.objects.create_user(username='patchuser', password='a-strong-passphrase-42')
        self.token = AuthToken.objects.create(user=self.user)
        self.auth_header = {'HTTP_AUTHORIZATION': f'Token {self.token.key}'}

    def test_patch_creates_row_on_first_call(self):
        self.assertFalse(ChecklistProgress.objects.filter(user=self.user).exists())
        response = self.client.patch(
            self.url,
            data=json.dumps({'checked': {'water': True, 'food': False}}),
            content_type='application/json',
            **self.auth_header,
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['checked'], {'water': True, 'food': False})
        self.assertIsNotNone(data['updatedAt'])

        progress = ChecklistProgress.objects.get(user=self.user)
        self.assertEqual(progress.checked, {'water': True, 'food': False})

    def test_patch_is_a_full_replace_and_persists(self):
        self.client.patch(
            self.url,
            data=json.dumps({'checked': {'water': True, 'food': True}}),
            content_type='application/json',
            **self.auth_header,
        )
        response = self.client.patch(
            self.url,
            data=json.dumps({'checked': {'water': False}}),
            content_type='application/json',
            **self.auth_header,
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['checked'], {'water': False})

        get_response = self.client.get(self.url, **self.auth_header)
        self.assertEqual(get_response.json()['checked'], {'water': False})

    def test_patch_with_missing_token_returns_401(self):
        response = self.client.patch(
            self.url,
            data=json.dumps({'checked': {'water': True}}),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 401)

    def test_patch_with_malformed_json_returns_400_not_500(self):
        response = self.client.patch(
            self.url,
            data=b'{not valid json!!!',
            content_type='application/json',
            **self.auth_header,
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json(), {'error': 'Некорректный JSON'})

    def test_patch_with_missing_checked_key_returns_400(self):
        response = self.client.patch(
            self.url,
            data=json.dumps({}),
            content_type='application/json',
            **self.auth_header,
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json(), {'error': 'checked должен быть объектом'})

    def test_patch_with_non_dict_checked_returns_400(self):
        response = self.client.patch(
            self.url,
            data=json.dumps({'checked': ['water', 'food']}),
            content_type='application/json',
            **self.auth_header,
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json(), {'error': 'checked должен быть объектом'})

    def test_patch_with_non_boolean_values_returns_400(self):
        response = self.client.patch(
            self.url,
            data=json.dumps({'checked': {'water': 'yes'}}),
            content_type='application/json',
            **self.auth_header,
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json(), {'error': 'Значения checked должны быть true/false'})

    def test_patch_with_integer_value_returns_400(self):
        # Python bool is a subclass of int, but 1/0 must not be accepted.
        response = self.client.patch(
            self.url,
            data=json.dumps({'checked': {'water': 1}}),
            content_type='application/json',
            **self.auth_header,
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json(), {'error': 'Значения checked должны быть true/false'})

    def test_patch_with_more_than_200_keys_returns_400(self):
        checked = {f'item{i}': True for i in range(201)}
        response = self.client.patch(
            self.url,
            data=json.dumps({'checked': checked}),
            content_type='application/json',
            **self.auth_header,
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json(), {'error': 'Слишком много пунктов'})

    def test_patch_with_200_keys_succeeds(self):
        checked = {f'item{i}': True for i in range(200)}
        response = self.client.patch(
            self.url,
            data=json.dumps({'checked': checked}),
            content_type='application/json',
            **self.auth_header,
        )
        self.assertEqual(response.status_code, 200)

    def test_patch_with_overlong_key_returns_400(self):
        response = self.client.patch(
            self.url,
            data=json.dumps({'checked': {'x' * 101: True}}),
            content_type='application/json',
            **self.auth_header,
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json(), {'error': 'Слишком много пунктов'})

    def test_patch_accepts_arbitrary_key_names(self):
        # No hardcoded checklist-item validation: any string key is allowed.
        response = self.client.patch(
            self.url,
            data=json.dumps({'checked': {'some-totally-new-item-xyz': True}}),
            content_type='application/json',
            **self.auth_header,
        )
        self.assertEqual(response.status_code, 200)
