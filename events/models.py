from django.conf import settings
from django.db import models


class Event(models.Model):
    """A stress-triggering event a user flags ahead of time (exam, deadline, ...)."""

    TYPE_CHOICES = [
        ("exam", "Экзамен"),
        ("deadline", "Дедлайн"),
        ("project", "Проект"),
        ("other", "Другое"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="events"
    )
    title = models.CharField(max_length=255)
    date = models.DateField()
    type = models.CharField(max_length=16, choices=TYPE_CHOICES, default="other")

    class Meta:
        ordering = ["date"]

    def __str__(self):
        return f"{self.title} ({self.date})"
