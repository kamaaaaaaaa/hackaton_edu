from django.conf import settings
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.db.models import Avg
from django.shortcuts import redirect, render
from django.utils import timezone

from checkins.models import CheckIn

from .forms import JoinGroupForm


@login_required
def join(request):
    """Join a group by invite code, setting request.user.profile.group."""
    profile = request.user.profile
    if request.method == "POST":
        form = JoinGroupForm(request.POST)
        if form.is_valid():
            group = form.get_group()
            profile.group = group
            profile.save(update_fields=["group"])
            messages.success(request, f"Вы присоединились к группе «{group.name}».")
            return redirect("groups:dashboard")
    else:
        form = JoinGroupForm()
    return render(request, "groups/join.html", {"form": form, "current_group": profile.group})


@login_required
def dashboard(request):
    """Anonymous, aggregate-only dashboard for the user's group.

    Never queries or renders anything per-user (no names, no per-user rows) —
    only .aggregate()/grouped-by-date averages across the whole group, and
    only once at least ORG_DASHBOARD_MIN_WEEKLY_CHECKINS distinct users have
    checked in this week, to avoid effectively identifying a lone check-in.
    """
    group = request.user.profile.group
    min_required = settings.ORG_DASHBOARD_MIN_WEEKLY_CHECKINS
    context = {"group": group, "min_required": min_required}

    if group is None:
        return render(request, "groups/dashboard.html", context)

    today = timezone.localdate()
    week_start = today - timezone.timedelta(days=today.weekday())
    week_checkins = CheckIn.objects.filter(
        user__profile__group=group, date__gte=week_start, date__lte=today
    )
    distinct_users = week_checkins.values("user").distinct().count()
    context["distinct_users"] = distinct_users

    if distinct_users < min_required:
        context["has_enough_data"] = False
        return render(request, "groups/dashboard.html", context)

    context["has_enough_data"] = True
    context["aggregates"] = week_checkins.aggregate(
        avg_mood=Avg("mood"), avg_energy=Avg("energy"), avg_stress=Avg("stress")
    )
    # Grouped by calendar date only (never by user) — still a pure aggregate.
    context["daily_trend"] = list(
        week_checkins.values("date")
        .annotate(avg_mood=Avg("mood"), avg_energy=Avg("energy"), avg_stress=Avg("stress"))
        .order_by("date")
    )
    return render(request, "groups/dashboard.html", context)
