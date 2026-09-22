from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Profile


@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_profile(sender, instance, created, **kwargs):
    """Auto-create a blank Profile whenever a User is created.

    Signup (accounts/views.py SignupView) fills in the real user_type /
    parental_consent right after creation; this just guarantees every User
    always has a Profile, even ones created outside the signup flow (e.g.
    createsuperuser).
    """
    if created:
        Profile.objects.get_or_create(user=instance)
