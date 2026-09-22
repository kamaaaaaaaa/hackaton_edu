from django.db import models


class Article(models.Model):
    CATEGORY_CHOICES = [
        ("stress_burnout", "Стресс и выгорание"),
        ("emotional_health", "Эмоциональное здоровье"),
        ("sleep", "Сон"),
        ("time_management", "Тайм-менеджмент"),
        ("exam_prep", "Подготовка к экзаменам"),
        ("communication_conflicts", "Общение и конфликты"),
        ("work_rest_balance", "Баланс работы и отдыха"),
        ("asking_for_help", "Как попросить о помощи"),
    ]

    AUDIENCE_CHOICES = [
        ("schoolchild", "Школьник"),
        ("student", "Студент"),
        ("adult", "Взрослый"),
        ("all", "Все"),
    ]

    title = models.CharField(max_length=255)
    category = models.CharField(max_length=32, choices=CATEGORY_CHOICES)
    audience = models.CharField(max_length=16, choices=AUDIENCE_CHOICES, default="all")
    read_minutes = models.PositiveSmallIntegerField(default=5)
    body = models.TextField()
    practice_5min = models.TextField(blank=True)
    sources = models.TextField(blank=True)

    def __str__(self):
        return self.title
