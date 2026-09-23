from django.test import TestCase

from .models import AssemblyPoint


class ListAssemblyPointsTests(TestCase):
    def setUp(self):
        self.url = '/api/assembly-points/'

    def test_list_returns_seeded_points_with_expected_shape(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'application/json')
        data = response.json()

        self.assertIsInstance(data, list)
        self.assertGreaterEqual(len(data), 1)

        point = next(p for p in data if p['id'] == 'alatau-01')
        self.assertEqual(point['district'], 'Алатауский')
        self.assertEqual(point['name'], 'Школа №114')
        self.assertEqual(point['address'], 'ул. Коунрадская, 12а')
        self.assertEqual(point['lat'], 43.260494)
        self.assertEqual(point['lng'], 76.879166)
        self.assertEqual(point['type'], 'school')
        self.assertIn('source', point)
        self.assertIn('geocodeConfidence', point)
        self.assertIn('needsReview', point)
        self.assertIn('geocodeMethod', point)
        self.assertIn('geocodeProvider', point)
        self.assertIn('geocodeNote', point)

        # Snake_case model fields must never leak into the response.
        self.assertNotIn('needs_review', point)
        self.assertNotIn('geocode_method', point)

    def test_list_on_empty_table_returns_empty_list_not_error(self):
        AssemblyPoint.objects.all().delete()
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), [])

    def test_list_does_not_require_auth(self):
        response = self.client.get(self.url)
        self.assertNotEqual(response.status_code, 401)

    def test_list_rejects_post(self):
        response = self.client.post(self.url)
        self.assertEqual(response.status_code, 405)


class SeedMigrationTests(TestCase):
    def test_seed_migration_populated_around_fifty_points(self):
        # This relies on the RunPython data migration having run as part of
        # the test database setup (same as it will on a fresh `migrate`).
        count = AssemblyPoint.objects.count()
        self.assertGreaterEqual(count, 40)
        self.assertLessEqual(count, 60)
