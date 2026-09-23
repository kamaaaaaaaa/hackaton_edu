import secrets

from django.conf import settings
from django.db import models


def _generate_key():
    return secrets.token_hex(20)


class AuthToken(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name='auth_tokens',
        on_delete=models.CASCADE,
    )
    key = models.CharField(max_length=64, unique=True, default=_generate_key)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.key[:8]}… ({self.user})'
