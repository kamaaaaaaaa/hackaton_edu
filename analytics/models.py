from django.db import models


class AnalyticsEvent(models.Model):
    event_type = models.CharField(max_length=64)
    meta = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    def __str__(self):
        return f'{self.event_type} @ {self.created_at.isoformat()}'
