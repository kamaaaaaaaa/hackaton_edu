from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import Profile, User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    """Reuses Django's built-in UserAdmin layout for our custom User model."""

    fieldsets = UserAdmin.fieldsets + (
        ("Profile", {"fields": ("bio", "avatar_url")}),
    )


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "nickname", "user_type", "group", "parental_consent")
    list_filter = ("user_type", "parental_consent")
    search_fields = ("user__username", "nickname")
