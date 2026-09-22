from django.test import TestCase
from django.urls import reverse

from .models import Article


class ArticleSeedDataTests(TestCase):
    def test_at_least_twelve_articles_seeded(self):
        self.assertGreaterEqual(Article.objects.count(), 12)

    def test_all_eight_categories_present(self):
        seeded_categories = set(Article.objects.values_list("category", flat=True))
        all_categories = {key for key, _ in Article.CATEGORY_CHOICES}
        self.assertEqual(seeded_categories, all_categories)

    def test_articles_have_practice_and_sources(self):
        for article in Article.objects.all():
            self.assertTrue(article.body.strip())
            self.assertTrue(article.practice_5min.strip())
            self.assertTrue(article.sources.strip())


class ArticleListViewTests(TestCase):
    def test_list_page_ok(self):
        response = self.client.get(reverse("articles:list"))
        self.assertEqual(response.status_code, 200)

    def test_filter_by_category(self):
        response = self.client.get(reverse("articles:list"), {"category": "sleep"})
        self.assertEqual(response.status_code, 200)
        for article in response.context["articles"]:
            self.assertEqual(article.category, "sleep")

    def test_filter_by_audience(self):
        response = self.client.get(reverse("articles:list"), {"audience": "student"})
        self.assertEqual(response.status_code, 200)
        for article in response.context["articles"]:
            self.assertEqual(article.audience, "student")

    def test_search_by_query(self):
        article = Article.objects.first()
        keyword = article.title.split()[0]
        response = self.client.get(reverse("articles:list"), {"q": keyword})
        self.assertEqual(response.status_code, 200)
        self.assertIn(article, response.context["articles"])


class ArticleDetailViewTests(TestCase):
    def test_detail_page_ok(self):
        article = Article.objects.first()
        response = self.client.get(reverse("articles:detail", args=[article.pk]))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, article.title)
