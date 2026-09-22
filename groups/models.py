import random
import string

from django.db import models


def _generate_invite_code():
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=6))


class Group(models.Model):
    """A class/cohort/organization grouping of users (school class, university
    group, workplace team, ...). Members join via `invite_code`.
    """

    name = models.CharField(max_length=150)
    invite_code = models.CharField(max_length=12, unique=True, blank=True)

    def save(self, *args, **kwargs):
        if not self.invite_code:
            code = _generate_invite_code()
            while Group.objects.filter(invite_code=code).exists():
                code = _generate_invite_code()
            self.invite_code = code
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name
