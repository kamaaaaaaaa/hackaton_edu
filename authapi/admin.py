from django.contrib import admin

from .models import AuthToken


@admin.register(AuthToken)
class AuthTokenAdmin(admin.ModelAdmin):
    list_display = ('key', 'user', 'created_at')
    readonly_fields = ('key', 'created_at')
    search_fields = ('key', 'user__username')
    list_filter = ('created_at',)
