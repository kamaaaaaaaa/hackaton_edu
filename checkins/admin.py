from django.contrib import admin

from .models import CheckIn


@admin.register(CheckIn)
class CheckInAdmin(admin.ModelAdmin):
    list_display = ("user", "date", "mood", "energy", "stress", "sleep_hours")
    list_filter = ("date",)
    search_fields = ("user__username",)
