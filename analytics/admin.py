from django.contrib import admin

from .models import AnalyticsEvent


@admin.register(AnalyticsEvent)
class AnalyticsEventAdmin(admin.ModelAdmin):
    list_display = ('event_type', 'created_at', 'meta')
    list_filter = ('event_type', 'created_at')
    search_fields = ('event_type',)
