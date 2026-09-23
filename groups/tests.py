import json

from django.test import TestCase

from .models import FamilyGroup, FamilyMember


class CreateGroupTests(TestCase):
    def setUp(self):
        self.url = '/api/groups/create/'

    def test_create_with_valid_name_returns_201_with_expected_shape(self):
        response = self.client.post(
            self.url,
            data=json.dumps({'name': 'Мама', 'phone': '+7 701 123 45 67'}),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response['Content-Type'], 'application/json')
        data = response.json()

        code = data['group']['code']
        self.assertEqual(len(code), 6)
        self.assertTrue(code.isupper() or code.isdigit() or code.isalnum())
        for bad_char in '0O1IL':
            self.assertNotIn(bad_char, code)

        member = data['member']
        self.assertIn('id', member)
        self.assertIn('token', member)
        self.assertTrue(len(member['token']) > 0)
        self.assertEqual(member['name'], 'Мама')
        self.assertEqual(member['phone'], '+7 701 123 45 67')
        self.assertTrue(member['isSelf'])
        self.assertEqual(member['status'], 'unknown')
        self.assertIn('updatedAt', member)

        self.assertTrue(FamilyGroup.objects.filter(code=code).exists())
        self.assertTrue(FamilyMember.objects.filter(token=member['token']).exists())

    def test_create_with_blank_name_returns_400(self):
        response = self.client.post(
            self.url,
            data=json.dumps({'name': '   ', 'phone': ''}),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json(), {'error': 'Укажи имя'})

    def test_create_with_missing_name_returns_400(self):
        response = self.client.post(
            self.url,
            data=json.dumps({}),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 400)

    def test_create_with_malformed_json_returns_400_not_500(self):
        response = self.client.post(
            self.url,
            data=b'{not valid json!!!',
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 400)

    def test_create_defaults_phone_to_empty_string(self):
        response = self.client.post(
            self.url,
            data=json.dumps({'name': 'Папа'}),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()['member']['phone'], '')


class JoinGroupTests(TestCase):
    def setUp(self):
        self.create_url = '/api/groups/create/'
        self.join_url = '/api/groups/join/'
        response = self.client.post(
            self.create_url,
            data=json.dumps({'name': 'Мама'}),
            content_type='application/json',
        )
        self.group_code = response.json()['group']['code']

    def test_join_with_valid_code_returns_200_and_adds_member(self):
        response = self.client.post(
            self.join_url,
            data=json.dumps({'code': self.group_code.lower(), 'name': 'Папа', 'phone': ''}),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['group']['code'], self.group_code)
        self.assertTrue(data['member']['isSelf'])
        self.assertIn('token', data['member'])

        group = FamilyGroup.objects.get(code=self.group_code)
        self.assertEqual(group.members.count(), 2)

    def test_join_with_invalid_code_returns_404(self):
        response = self.client.post(
            self.join_url,
            data=json.dumps({'code': 'ZZZZZZ', 'name': 'Папа', 'phone': ''}),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 404)
        self.assertEqual(
            response.json(), {'error': 'Группа с таким кодом не найдена'}
        )

    def test_join_with_blank_name_returns_400(self):
        response = self.client.post(
            self.join_url,
            data=json.dumps({'code': self.group_code, 'name': '', 'phone': ''}),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 400)

    def test_join_with_malformed_json_returns_400(self):
        response = self.client.post(
            self.join_url,
            data=b'not json at all',
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 400)


class MembersListTests(TestCase):
    def setUp(self):
        self.create_url = '/api/groups/create/'
        self.join_url = '/api/groups/join/'
        response = self.client.post(
            self.create_url,
            data=json.dumps({'name': 'Мама'}),
            content_type='application/json',
        )
        self.group_code = response.json()['group']['code']
        self.client.post(
            self.join_url,
            data=json.dumps({'code': self.group_code, 'name': 'Папа'}),
            content_type='application/json',
        )

    def test_list_never_includes_token(self):
        response = self.client.get(f'/api/groups/{self.group_code}/members/')
        self.assertEqual(response.status_code, 200)
        self.assertNotIn('token', response.content.decode('utf-8'))

        data = response.json()
        self.assertEqual(data['group']['code'], self.group_code)
        self.assertEqual(len(data['members']), 2)
        for member in data['members']:
            self.assertFalse(member['isSelf'])
            self.assertNotIn('token', member)

    def test_list_for_nonexistent_group_returns_404(self):
        response = self.client.get('/api/groups/ZZZZZZ/members/')
        self.assertEqual(response.status_code, 404)

    def test_list_is_case_insensitive_on_code(self):
        response = self.client.get(f'/api/groups/{self.group_code.lower()}/members/')
        self.assertEqual(response.status_code, 200)


class UpdateMemberTests(TestCase):
    def setUp(self):
        self.create_url = '/api/groups/create/'
        response = self.client.post(
            self.create_url,
            data=json.dumps({'name': 'Мама'}),
            content_type='application/json',
        )
        data = response.json()
        self.group_code = data['group']['code']
        self.member_id = data['member']['id']
        self.token = data['member']['token']
        self.patch_url = f'/api/groups/{self.group_code}/members/{self.member_id}/'

    def test_patch_with_correct_token_updates_status(self):
        response = self.client.patch(
            self.patch_url,
            data=json.dumps({'token': self.token, 'status': 'safe'}),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['status'], 'safe')
        self.assertNotIn('token', data)
        self.assertFalse(data['isSelf'])

        member = FamilyMember.objects.get(id=self.member_id)
        self.assertEqual(member.status, 'safe')

    def test_patch_with_wrong_token_returns_403_and_does_not_change_status(self):
        response = self.client.patch(
            self.patch_url,
            data=json.dumps({'token': 'wrong-token', 'status': 'safe'}),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.json(), {'error': 'Неверный токен'})

        # Verify by re-fetching via the members list endpoint.
        list_response = self.client.get(f'/api/groups/{self.group_code}/members/')
        member_data = list_response.json()['members'][0]
        self.assertEqual(member_data['status'], 'unknown')

    def test_patch_with_invalid_status_returns_400(self):
        response = self.client.patch(
            self.patch_url,
            data=json.dumps({'token': self.token, 'status': 'not_a_real_status'}),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 400)

        member = FamilyMember.objects.get(id=self.member_id)
        self.assertEqual(member.status, 'unknown')

    def test_patch_on_nonexistent_group_returns_404(self):
        response = self.client.patch(
            f'/api/groups/ZZZZZZ/members/{self.member_id}/',
            data=json.dumps({'token': self.token, 'status': 'safe'}),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 404)

    def test_patch_on_nonexistent_member_returns_404(self):
        response = self.client.patch(
            f'/api/groups/{self.group_code}/members/999999/',
            data=json.dumps({'token': self.token, 'status': 'safe'}),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 404)

    def test_patch_with_malformed_json_returns_400(self):
        response = self.client.patch(
            self.patch_url,
            data=b'garbage-not-json',
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 400)


class GroupDataMeetingPointFieldTests(TestCase):
    def test_create_response_includes_meeting_point_id_as_null_by_default(self):
        response = self.client.post(
            '/api/groups/create/',
            data=json.dumps({'name': 'Мама'}),
            content_type='application/json',
        )
        self.assertIn('meetingPointId', response.json()['group'])
        self.assertIsNone(response.json()['group']['meetingPointId'])

    def test_join_response_includes_meeting_point_id(self):
        create_response = self.client.post(
            '/api/groups/create/',
            data=json.dumps({'name': 'Мама'}),
            content_type='application/json',
        )
        code = create_response.json()['group']['code']
        join_response = self.client.post(
            '/api/groups/join/',
            data=json.dumps({'code': code, 'name': 'Папа'}),
            content_type='application/json',
        )
        self.assertIn('meetingPointId', join_response.json()['group'])

    def test_members_list_response_includes_meeting_point_id(self):
        create_response = self.client.post(
            '/api/groups/create/',
            data=json.dumps({'name': 'Мама'}),
            content_type='application/json',
        )
        code = create_response.json()['group']['code']
        list_response = self.client.get(f'/api/groups/{code}/members/')
        self.assertIn('meetingPointId', list_response.json()['group'])


class UpdateMeetingPointTests(TestCase):
    def setUp(self):
        response = self.client.post(
            '/api/groups/create/',
            data=json.dumps({'name': 'Мама'}),
            content_type='application/json',
        )
        data = response.json()
        self.group_code = data['group']['code']
        self.token = data['member']['token']
        self.patch_url = f'/api/groups/{self.group_code}/meeting-point/'

    def test_patch_with_correct_token_sets_meeting_point_and_returns_200(self):
        response = self.client.patch(
            self.patch_url,
            data=json.dumps({'token': self.token, 'pointId': 'alatau-01'}),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(), {'group': {'code': self.group_code, 'meetingPointId': 'alatau-01'}}
        )

        group = FamilyGroup.objects.get(code=self.group_code)
        self.assertEqual(group.meeting_point_id, 'alatau-01')

    def test_patch_with_null_point_id_clears_meeting_point(self):
        self.client.patch(
            self.patch_url,
            data=json.dumps({'token': self.token, 'pointId': 'alatau-01'}),
            content_type='application/json',
        )
        response = self.client.patch(
            self.patch_url,
            data=json.dumps({'token': self.token, 'pointId': None}),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.json()['group']['meetingPointId'])

        group = FamilyGroup.objects.get(code=self.group_code)
        self.assertEqual(group.meeting_point_id, '')

    def test_patch_works_for_any_member_of_the_group_not_just_creator(self):
        join_response = self.client.post(
            '/api/groups/join/',
            data=json.dumps({'code': self.group_code, 'name': 'Папа'}),
            content_type='application/json',
        )
        other_token = join_response.json()['member']['token']

        response = self.client.patch(
            self.patch_url,
            data=json.dumps({'token': other_token, 'pointId': 'almaly-01'}),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['group']['meetingPointId'], 'almaly-01')

    def test_patch_with_wrong_token_returns_403_and_does_not_change_point(self):
        response = self.client.patch(
            self.patch_url,
            data=json.dumps({'token': 'wrong-token', 'pointId': 'alatau-01'}),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.json(), {'error': 'Неверный токен'})

        group = FamilyGroup.objects.get(code=self.group_code)
        self.assertEqual(group.meeting_point_id, '')

    def test_patch_on_nonexistent_group_returns_404(self):
        response = self.client.patch(
            '/api/groups/ZZZZZZ/meeting-point/',
            data=json.dumps({'token': self.token, 'pointId': 'alatau-01'}),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 404)
        self.assertEqual(
            response.json(), {'error': 'Группа с таким кодом не найдена'}
        )

    def test_patch_is_case_insensitive_on_code(self):
        response = self.client.patch(
            f'/api/groups/{self.group_code.lower()}/meeting-point/',
            data=json.dumps({'token': self.token, 'pointId': 'alatau-01'}),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 200)

    def test_patch_with_malformed_json_returns_400(self):
        response = self.client.patch(
            self.patch_url,
            data=b'not json at all',
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json(), {'error': 'Некорректный JSON'})

    def test_patch_with_non_string_point_id_returns_400(self):
        response = self.client.patch(
            self.patch_url,
            data=json.dumps({'token': self.token, 'pointId': 42}),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.json(), {'error': 'pointId должен быть строкой или null'}
        )

    def test_patch_with_missing_point_id_key_returns_400(self):
        response = self.client.patch(
            self.patch_url,
            data=json.dumps({'token': self.token}),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.json(), {'error': 'pointId должен быть строкой или null'}
        )
