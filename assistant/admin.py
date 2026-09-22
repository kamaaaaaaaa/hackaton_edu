from django.contrib import admin

from .models import Recommendation


@admin.register(Recommendation)
class RecommendationAdmin(admin.ModelAdmin):
    list_display = ("user", "date", "feedback", "article")
    list_filter = ("feedback", "date")
    search_fields = ("user__username", "text")
