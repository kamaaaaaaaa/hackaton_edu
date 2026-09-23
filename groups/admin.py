from django.contrib import admin

from .models import FamilyGroup, FamilyMember


class FamilyMemberInline(admin.TabularInline):
    model = FamilyMember
    extra = 0
    readonly_fields = ('token', 'updated_at')
    fields = ('name', 'phone', 'status', 'token', 'updated_at')


@admin.register(FamilyGroup)
class FamilyGroupAdmin(admin.ModelAdmin):
    list_display = ('code', 'created_at')
    readonly_fields = ('created_at',)
    search_fields = ('code',)
    inlines = [FamilyMemberInline]


@admin.register(FamilyMember)
class FamilyMemberAdmin(admin.ModelAdmin):
    list_display = ('name', 'group', 'phone', 'status', 'updated_at')
    list_filter = ('status',)
    readonly_fields = ('token', 'updated_at')
    search_fields = ('name', 'phone', 'group__code')
