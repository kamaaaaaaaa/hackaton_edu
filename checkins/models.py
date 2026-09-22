from django.conf import settings
from django.db import models

SCALE_1_5 = [(i, str(i)) for i in range(1, 6)]


class CheckIn(models.Model):
    """One daily self-report: mood/energy/stress plus sleep. One per user per day."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="checkins"
    )
    date = models.DateField()
    mood = models.PositiveSmallIntegerField(choices=SCALE_1_5)
    energy = models.PositiveSmallIntegerField(choices=SCALE_1_5)
    stress = models.PositiveSmallIntegerField(choices=SCALE_1_5)
    sleep_hours = models.DecimalField(max_digits=4, decimal_places=1)
    note = models.TextField(blank=True)

    class Meta:
        unique_together = ("user", "date")
        ordering = ["-date"]

    def __str__(self):
        return f"{self.user} — {self.date}"
