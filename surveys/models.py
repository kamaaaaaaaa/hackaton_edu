from django.conf import settings
from django.db import models

# Copenhagen Burnout Inventory — personal burnout subscale (6 items).
# Each item is answered on the standard CBI 0/25/50/75/100 scale.
# рабочий перевод, требует проверки
CBI_ANSWER_CHOICES = [
    (0, "Никогда / почти никогда"),
    (25, "Редко"),
    (50, "Иногда"),
    (75, "Часто"),
    (100, "Всегда"),
]

# рабочий перевод, требует проверки
CBI_QUESTIONS = [
    "Как часто вы чувствуете себя уставшим(ей)?",
    "Как часто вы физически истощены?",
    "Как часто вы эмоционально истощены?",
    "Как часто вы думаете: «Я больше не могу»?",
    "Как часто вы чувствуете себя измотанным(ой)?",
    "Как часто вы чувствуете себя слабым(ой) и склонным(ой) заболеть?",
]


class WeeklySurvey(models.Model):
    """Weekly Copenhagen Burnout Inventory (personal burnout subscale) check.

    рабочий перевод, требует проверки
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="weekly_surveys"
    )
    date = models.DateField()
    q1 = models.PositiveSmallIntegerField(choices=CBI_ANSWER_CHOICES)
    q2 = models.PositiveSmallIntegerField(choices=CBI_ANSWER_CHOICES)
    q3 = models.PositiveSmallIntegerField(choices=CBI_ANSWER_CHOICES)
    q4 = models.PositiveSmallIntegerField(choices=CBI_ANSWER_CHOICES)
    q5 = models.PositiveSmallIntegerField(choices=CBI_ANSWER_CHOICES)
    q6 = models.PositiveSmallIntegerField(choices=CBI_ANSWER_CHOICES)
    score = models.DecimalField(max_digits=5, decimal_places=2)

    class Meta:
        ordering = ["-date"]

    def compute_score(self):
        """Average of the six 0-100 answers, per the standard CBI scoring."""
        answers = [self.q1, self.q2, self.q3, self.q4, self.q5, self.q6]
        return sum(answers) / len(answers)

    def save(self, *args, **kwargs):
        self.score = self.compute_score()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.user} — {self.date} ({self.score})"
