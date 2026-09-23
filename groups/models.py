from django.db import models


class FamilyGroup(models.Model):
    code = models.CharField(max_length=6, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    meeting_point_id = models.CharField(max_length=64, blank=True, default='')

    def __str__(self):
        return self.code


class FamilyMember(models.Model):
    STATUS_SAFE = 'safe'
    STATUS_NO_CONTACT = 'no_contact'
    STATUS_UNKNOWN = 'unknown'
    STATUS_CHOICES = [
        (STATUS_SAFE, 'Safe'),
        (STATUS_NO_CONTACT, 'No contact'),
        (STATUS_UNKNOWN, 'Unknown'),
    ]

    group = models.ForeignKey(FamilyGroup, related_name='members', on_delete=models.CASCADE)
    token = models.CharField(max_length=64, unique=True)
    name = models.CharField(max_length=150)
    phone = models.CharField(max_length=40, blank=True, default='')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_UNKNOWN)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.name} ({self.group.code})'
