from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Custom user model, kept minimal since the app's domain is not yet decided.

    Swapping in a custom user model later (after migrations exist) is painful in
    Django, so we set one up from the start even though it currently adds little
    beyond the defaults. `bio` and `avatar` are optional convenience fields that
    most hackathon apps end up wanting for a profile page.
    """

    bio = models.TextField(blank=True)
    # A URL rather than an ImageField: Pillow isn't in requirements.txt, and an
    # ImageField without it fails Django's system checks.
    avatar_url = models.URLField(blank=True)

    def __str__(self):
        return self.username
