import sys

from django.apps import AppConfig


class AccountsConfig(AppConfig):
    name = 'accounts'

    def ready(self):
        # Render's free tier has no shell access, so the production
        # superuser has to bootstrap itself on boot from env vars. Only
        # run this under gunicorn (i.e. actually serving in production) —
        # never during migrate/test/makemigrations/other management
        # commands, where sys.argv[0] is "manage.py".
        if 'gunicorn' not in sys.argv[0]:
            return

        from django.db.models.signals import post_migrate

        post_migrate.connect(_bootstrap_admin, sender=self)


def _bootstrap_admin(sender, **kwargs):
    from django.conf import settings
    from django.db import DatabaseError

    username = settings.ADMIN_USERNAME
    email = settings.ADMIN_EMAIL
    password = settings.ADMIN_PASSWORD

    if not (username and password):
        return

    from django.contrib.auth import get_user_model

    User = get_user_model()

    try:
        user, _created = User.objects.get_or_create(username=username)
        user.set_password(password)
        user.is_staff = True
        user.is_superuser = True
        user.email = email
        user.save()
    except DatabaseError as exc:
        # First-ever boot: post_migrate fires per app right after its own
        # migrations apply, but if something runs out of order (or the
        # accounts table genuinely isn't there yet), don't crash the
        # whole process over it.
        print(f'accounts: admin bootstrap skipped ({exc})')
