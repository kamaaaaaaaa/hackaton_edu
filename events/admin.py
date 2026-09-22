from django.contrib import admin

from .models import Event


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ("title", "user", "date", "type")
    list_filter = ("type", "date")
    search_fields = ("title", "user__username")
