from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    """Reuses Django's built-in UserAdmin layout for our custom User model."""

    fieldsets = UserAdmin.fieldsets + (
        ("Profile", {"fields": ("bio", "avatar_url")}),
    )
