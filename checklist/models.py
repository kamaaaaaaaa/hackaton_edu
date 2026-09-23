from django.conf import settings
from django.db import models


class ChecklistProgress(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        related_name='checklist_progress',
        on_delete=models.CASCADE,
    )
    checked = models.JSONField(default=dict, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'checklist for {self.user}'
