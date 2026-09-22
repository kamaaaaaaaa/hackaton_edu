from django.contrib import admin

from .models import Article


@admin.register(Article)
class ArticleAdmin(admin.ModelAdmin):
    list_display = ("title", "category", "audience", "read_minutes")
    list_filter = ("category", "audience")
    search_fields = ("title", "body")
