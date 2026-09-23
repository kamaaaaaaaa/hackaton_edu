import json

from django.contrib.auth import get_user_model
from django.test import TestCase

from .models import AuthToken

User = get_user_model()


class RegisterTests(TestCase):
    def setUp(self):
        self.url = '/api/auth/register/'

    def test_register_with_valid_data_returns_201_with_expected_shape(self):
        response = self.client.post(
            self.url,
            data=json.dumps({
                'username': 'newuser',
                'email': 'newuser@example.com',
                'password': 'a-strong-passphrase-42',
            }),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 201)
        data = response.json()

        self.assertEqual(data['user']['username'], 'newuser')
        self.assertEqual(data['user']['email'], 'newuser@example.com')
        self.assertFalse(data['user']['isStaff'])
        self.assertIn('id', data['user'])
        self.assertTrue(len(data['token']) > 0)

        user = User.objects.get(username='newuser')
        self.assertTrue(user.check_password('a-strong-passphrase-42'))
        self.assertTrue(AuthToken.objects.filter(key=data['token'], user=user).exists())

    def test_register_with_blank_username_returns_400(self):
        response = self.client.post(
            self.url,
            data=json.dumps({'username': '   ', 'email': '', 'password': 'a-strong-passphrase-42'}),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn('error', response.json())

    def test_register_with_taken_username_returns_400(self):
        User.objects.create_user(username='taken', password='whatever-strong-pw-1')
        response = self.client.post(
            self.url,
            data=json.dumps({'username': 'taken', 'email': '', 'password': 'a-strong-passphrase-42'}),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn('error', response.json())

    def test_register_with_weak_password_returns_400(self):
        response = self.client.post(
            self.url,
            data=json.dumps({'username': 'weakpw', 'email': '', 'password': '123'}),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn('error', response.json())
        self.assertFalse(User.objects.filter(username='weakpw').exists())

    def test_register_with_malformed_json_returns_400_not_500(self):
        response = self.client.post(self.url, data='{bad json', content_type='application/json')
        self.assertEqual(response.status_code, 400)


class LoginTests(TestCase):
    def setUp(self):
        self.url = '/api/auth/login/'
        self.user = User.objects.create_user(username='loginuser', password='a-strong-passphrase-42')

    def test_login_with_valid_credentials_returns_200_and_new_token(self):
        response = self.client.post(
            self.url,
            data=json.dumps({'username': 'loginuser', 'password': 'a-strong-passphrase-42'}),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['user']['username'], 'loginuser')
        self.assertTrue(len(data['token']) > 0)
        self.assertTrue(AuthToken.objects.filter(key=data['token'], user=self.user).exists())

    def test_login_issues_a_fresh_token_each_time(self):
        r1 = self.client.post(
            self.url,
            data=json.dumps({'username': 'loginuser', 'password': 'a-strong-passphrase-42'}),
            content_type='application/json',
        )
        r2 = self.client.post(
            self.url,
            data=json.dumps({'username': 'loginuser', 'password': 'a-strong-passphrase-42'}),
            content_type='application/json',
        )
        token1 = r1.json()['token']
        token2 = r2.json()['token']
        self.assertNotEqual(token1, token2)
        # Both tokens remain valid (multiple devices stay logged in).
        self.assertEqual(AuthToken.objects.filter(user=self.user).count(), 2)

    def test_login_with_wrong_password_returns_401(self):
        response = self.client.post(
            self.url,
            data=json.dumps({'username': 'loginuser', 'password': 'totally-wrong'}),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json(), {'error': 'Неверный логин или пароль'})

    def test_login_with_unknown_username_returns_401(self):
        response = self.client.post(
            self.url,
            data=json.dumps({'username': 'nosuchuser', 'password': 'whatever'}),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json(), {'error': 'Неверный логин или пароль'})


class MeAndLogoutTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='meuser', password='a-strong-passphrase-42')
        self.token = AuthToken.objects.create(user=self.user)

    def test_me_with_valid_token_returns_200(self):
        response = self.client.get(
            '/api/auth/me/',
            HTTP_AUTHORIZATION=f'Token {self.token.key}',
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['user']['username'], 'meuser')
        self.assertEqual(data['user']['id'], self.user.id)

    def test_me_with_invalid_token_returns_401(self):
        response = self.client.get(
            '/api/auth/me/',
            HTTP_AUTHORIZATION='Token not-a-real-token',
        )
        self.assertEqual(response.status_code, 401)

    def test_me_with_missing_token_returns_401(self):
        response = self.client.get('/api/auth/me/')
        self.assertEqual(response.status_code, 401)

    def test_logout_deletes_token_and_subsequent_me_is_401(self):
        response = self.client.post(
            '/api/auth/logout/',
            HTTP_AUTHORIZATION=f'Token {self.token.key}',
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {'ok': True})
        self.assertFalse(AuthToken.objects.filter(key=self.token.key).exists())

        followup = self.client.get(
            '/api/auth/me/',
            HTTP_AUTHORIZATION=f'Token {self.token.key}',
        )
        self.assertEqual(followup.status_code, 401)

    def test_logout_with_missing_token_returns_401(self):
        response = self.client.post('/api/auth/logout/')
        self.assertEqual(response.status_code, 401)
