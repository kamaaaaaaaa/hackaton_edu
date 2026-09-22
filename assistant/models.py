from django.conf import settings
from django.db import models


class Recommendation(models.Model):
    """An AI-generated recommendation shown to a user on a given day."""

    FEEDBACK_CHOICES = [
        ("none", "Нет отзыва"),
        ("helped", "Помогло"),
        ("not_helped", "Не помогло"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="recommendations"
    )
    date = models.DateField()
    text = models.TextField()
    why_explanation = models.TextField(blank=True)
    article = models.ForeignKey(
        "articles.Article", on_delete=models.SET_NULL, null=True, blank=True
    )
    feedback = models.CharField(max_length=16, choices=FEEDBACK_CHOICES, default="none")

    class Meta:
        ordering = ["-date"]

    def __str__(self):
        return f"{self.user} — {self.date}"
