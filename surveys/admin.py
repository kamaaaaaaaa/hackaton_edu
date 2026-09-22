from django.contrib import admin

from .models import WeeklySurvey


@admin.register(WeeklySurvey)
class WeeklySurveyAdmin(admin.ModelAdmin):
    list_display = ("user", "date", "score")
    list_filter = ("date",)
    search_fields = ("user__username",)
    readonly_fields = ("score",)
