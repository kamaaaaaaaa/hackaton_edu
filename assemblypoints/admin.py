from django.contrib import admin

from .models import AssemblyPoint


@admin.register(AssemblyPoint)
class AssemblyPointAdmin(admin.ModelAdmin):
    list_display = ('id', 'district', 'name', 'needs_review')
    list_filter = ('district', 'type', 'needs_review')
    search_fields = ('name', 'address')
