"""Seed a full demo dataset for AntiВыгорание.

Creates:
  - a demo student (`demo_student`) with 30 days of CheckIn history shaped
    so the personal-baseline burnout status (checkins/services.py) genuinely
    escalates: ~20 stable/good days followed by ~10 days of a realistic
    pre-exam decline (rising stress, falling sleep, falling mood/energy).
  - two Events for that student (one past exam with a detectable stress
    rise beforehand, one upcoming exam ~10 days out) so the event-forecast
    logic (events/services.py) has real history to compute from instead of
    just returning its default.
  - two WeeklySurvey entries for the student (an earlier calm one, a more
    recent elevated one) so the progress page's survey section has data.
  - a demo Group ("Демо-группа") with 8 member accounts, each with a
    handful of CheckIns dated in the current calendar week, so the org
    dashboard's privacy threshold (ORG_DASHBOARD_MIN_WEEKLY_CHECKINS) is
    genuinely exceeded and shows real aggregates. The demo student also
    joins this group, so logging in as demo_student can view the dashboard
    directly.

Idempotent-ish: users/group are get_or_create'd (safe to rerun — same
credentials every time), but each run DELETES and RECREATES all seeded
CheckIn/Event/WeeklySurvey rows for these accounts, so the data stays
correctly dated relative to "today" no matter when the command is re-run.
"""
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone

from checkins.models import CheckIn
from events.models import Event
from groups.models import Group
from surveys.models import WeeklySurvey

User = get_user_model()

DEMO_STUDENT_USERNAME = "demo_student"
DEMO_STUDENT_PASSWORD = "DemoStudent2026!"

DEMO_GROUP_NAME = "Демо-группа"
DEMO_MEMBER_COUNT = 8
DEMO_MEMBER_PASSWORD = "DemoMember2026!"  # shared, simple — not individually documented

# ---------------------------------------------------------------------------
# 30-day check-in shape for the demo student.
#
# Oldest 20 days (offsets 29..10): stable/good, constant on purpose so the
# personal baseline (computed from the oldest BURNOUT_BASELINE_FULL_DAYS=14
# check-ins) lands exactly on mood=5/energy=4/stress=1 with zero stdev —
# deterministic and easy to reason about.
#
# Most recent 10 days (offsets 9..0): a realistic pre-exam decline — mood,
# energy and sleep fall while stress climbs, every single day scoring below
# the baseline with NO calendar gap, so checkins.services' consecutive-
# decline-streak scan finds a full, unbroken 10-day streak. That clears
# both the "attention" and the (stricter) "specialist" escalation bar.
# ---------------------------------------------------------------------------
STABLE_DAYS = 20
STABLE_PROFILE = {"mood": 5, "energy": 4, "stress": 1}
STABLE_SLEEP_CYCLE = [Decimal("7.5"), Decimal("8.0"), Decimal("7.0"), Decimal("8.5")]

# offsets 9 -> 0 (9 = ten days before today, 0 = today)
DECLINE_PROFILE = [
    # (mood, energy, stress, sleep_hours)
    (4, 4, 2, Decimal("6.5")),
    (4, 3, 3, Decimal("6.0")),
    (3, 3, 3, Decimal("6.0")),
    (3, 3, 4, Decimal("5.5")),
    (3, 2, 4, Decimal("5.0")),
    (2, 2, 4, Decimal("5.0")),
    (2, 2, 5, Decimal("4.5")),
    (2, 1, 5, Decimal("4.5")),
    (1, 2, 5, Decimal("4.0")),
    (1, 1, 5, Decimal("4.0")),
]


class Command(BaseCommand):
    help = "Seed demo data: a student with a burnout-triggering history, events, surveys, and a group."

    def handle(self, *args, **options):
        today = timezone.localdate()

        student = self._seed_demo_student(today)
        group = self._seed_demo_group(today, student)
        self._seed_events(student, today)
        self._seed_surveys(student, today)

        self.stdout.write(self.style.SUCCESS("Demo data seeded."))
        self.stdout.write(f"  Demo student login: {DEMO_STUDENT_USERNAME} / {DEMO_STUDENT_PASSWORD}")
        self.stdout.write(f"  Demo group: {group.name} (invite code {group.invite_code})")
        self.stdout.write(f"  Demo group members: demo_member1..{DEMO_MEMBER_COUNT} / {DEMO_MEMBER_PASSWORD}")

    # -- demo student -------------------------------------------------

    def _seed_demo_student(self, today):
        student, _ = User.objects.get_or_create(
            username=DEMO_STUDENT_USERNAME,
            defaults={"email": "demo_student@example.com"},
        )
        student.set_password(DEMO_STUDENT_PASSWORD)
        student.email = "demo_student@example.com"
        student.save()

        student.profile.user_type = "student"
        student.profile.nickname = "Демо-студент"
        student.profile.save(update_fields=["user_type", "nickname"])

        # Recreate check-in history fresh every run so dates stay correct
        # relative to "today".
        CheckIn.objects.filter(user=student).delete()

        rows = []
        # Oldest 20 days: offsets 29..10
        for i in range(STABLE_DAYS):
            offset = 29 - i
            date = today - timedelta(days=offset)
            rows.append(CheckIn(
                user=student,
                date=date,
                mood=STABLE_PROFILE["mood"],
                energy=STABLE_PROFILE["energy"],
                stress=STABLE_PROFILE["stress"],
                sleep_hours=STABLE_SLEEP_CYCLE[i % len(STABLE_SLEEP_CYCLE)],
                note="",
            ))
        # Most recent 10 days: offsets 9..0
        for offset, (mood, energy, stress, sleep_hours) in zip(range(9, -1, -1), DECLINE_PROFILE):
            date = today - timedelta(days=offset)
            rows.append(CheckIn(
                user=student, date=date, mood=mood, energy=energy,
                stress=stress, sleep_hours=sleep_hours, note="",
            ))
        CheckIn.objects.bulk_create(rows)

        return student

    # -- demo group -----------------------------------------------------

    def _seed_demo_group(self, today, student):
        group, _ = Group.objects.get_or_create(name=DEMO_GROUP_NAME)

        student.profile.group = group
        student.profile.save(update_fields=["group"])

        week_start = today - timedelta(days=today.weekday())
        days_in_week_so_far = (today - week_start).days + 1  # at least 1 (today)

        for i in range(1, DEMO_MEMBER_COUNT + 1):
            username = f"demo_member{i}"
            member, _ = User.objects.get_or_create(
                username=username, defaults={"email": f"{username}@example.com"},
            )
            member.set_password(DEMO_MEMBER_PASSWORD)
            member.save()
            member.profile.user_type = "student"
            member.profile.group = group
            member.profile.save(update_fields=["user_type", "group"])

            CheckIn.objects.filter(user=member).delete()
            # A handful of check-ins (up to 4) within the current week, so
            # this member counts toward the org dashboard's weekly distinct
            # check-in threshold.
            num_checkins = min(4, days_in_week_so_far)
            rows = []
            for d in range(num_checkins):
                date = today - timedelta(days=d)
                # Mild per-member variety so the aggregate isn't a flat number.
                mood = 3 + (i % 3)
                energy = 3 + ((i + 1) % 3)
                stress = 1 + (i % 3)
                sleep = Decimal("6.5") + Decimal(str((i % 3) * 0.5))
                rows.append(CheckIn(
                    user=member, date=date, mood=mood, energy=energy,
                    stress=stress, sleep_hours=sleep, note="",
                ))
            CheckIn.objects.bulk_create(rows)

        return group

    # -- events -----------------------------------------------------------

    def _seed_events(self, student, today):
        Event.objects.filter(user=student).delete()
        # A past exam, 3 days ago — the decline block above already has
        # elevated stress on the days before it, so events/services.py's
        # forecast_heads_up_days() computes a real lead-time from it instead
        # of falling back to EVENT_FORECAST_DEFAULT_DAYS.
        Event.objects.create(
            user=student, title="Экзамен по матанализу (прошедший)",
            date=today - timedelta(days=3), type="exam",
        )
        # An upcoming exam ~10 days out, so the events page shows a
        # meaningful heads-up forecast computed from the history above.
        Event.objects.create(
            user=student, title="Экзамен по физике",
            date=today + timedelta(days=10), type="exam",
        )

    # -- weekly surveys -----------------------------------------------------

    def _seed_surveys(self, student, today):
        WeeklySurvey.objects.filter(user=student).delete()
        # An earlier, calm survey.
        WeeklySurvey.objects.create(
            user=student, date=today - timedelta(days=14),
            q1=0, q2=25, q3=0, q4=0, q5=25, q6=0,
        )
        # A more recent one showing rising exhaustion, matching the
        # check-in decline. Dated 8 days ago (>= WEEKLY_SURVEY_INTERVAL_DAYS
        # of 7), so due_for_survey() is True right after seeding and the
        # home page's weekly-survey reminder banner shows — deliberate,
        # to demo that flow too.
        WeeklySurvey.objects.create(
            user=student, date=today - timedelta(days=8),
            q1=75, q2=75, q3=50, q4=50, q5=75, q6=50,
        )
