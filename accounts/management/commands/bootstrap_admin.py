"""Create/update the production superuser from env vars.

Render's free tier has no Shell/One-off Jobs, so this has to be an
explicit build step (see render.yaml's buildCommand) instead of a
manual `createsuperuser` — running it here, right after `migrate` in
the same build process, is the only reliable place: the account
tables are guaranteed to exist, and the command's own output shows up
in the Render build log so success/failure is actually visible.

(An earlier version tried to do this via a post_migrate signal
connected from AccountsConfig.ready(), gated on only running under
gunicorn. That never worked: `migrate` runs once, during the build,
as its own `manage.py migrate` process — not under gunicorn — so the
signal handler was connected in the one process where the signal
never fires, and never connected in the one where it does.)
"""

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Create or update the admin superuser from ADMIN_USERNAME/ADMIN_EMAIL/ADMIN_PASSWORD."

    def handle(self, *args, **options):
        username = settings.ADMIN_USERNAME
        email = settings.ADMIN_EMAIL
        password = settings.ADMIN_PASSWORD

        if not (username and password):
            self.stdout.write("bootstrap_admin: ADMIN_USERNAME/ADMIN_PASSWORD not set, skipping.")
            return

        User = get_user_model()
        user, created = User.objects.get_or_create(username=username)
        user.set_password(password)
        user.is_staff = True
        user.is_superuser = True
        user.email = email
        user.save()

        action = "Created" if created else "Updated"
        self.stdout.write(self.style.SUCCESS(f"bootstrap_admin: {action} superuser '{username}'."))
