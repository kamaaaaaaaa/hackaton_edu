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


class Profile(models.Model):
    """Domain profile for a User: how they use the app, and their optional group.

    Auto-created (blank) via a post_save signal whenever a User is created —
    see accounts/signals.py — and filled in (user_type, ...) at signup time.
    """

    USER_TYPE_CHOICES = [
        ("schoolchild", "Школьник"),
        ("student", "Студент"),
        ("adult", "Взрослый"),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    nickname = models.CharField(max_length=50, blank=True)
    user_type = models.CharField(max_length=16, choices=USER_TYPE_CHOICES, default="student")
    group = models.ForeignKey(
        "groups.Group", on_delete=models.SET_NULL, null=True, blank=True
    )
    # Only meaningful when user_type == "schoolchild".
    parental_consent = models.BooleanField(default=False)

    def __str__(self):
        return f"Profile({self.user})"
