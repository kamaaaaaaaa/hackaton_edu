from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.shortcuts import redirect, render
from django.utils import timezone

from .forms import EventForm
from .models import Event
from .services import forecast_heads_up_days


@login_required
def index(request):
    """Add-event form plus this user's upcoming events, each annotated with
    a heads-up forecast: how many days before it stress has historically
    started rising for events of that type (see events/services.py)."""
    today = timezone.localdate()

    if request.method == "POST":
        form = EventForm(request.POST)
        if form.is_valid():
            event = form.save(commit=False)
            event.user = request.user
            event.save()
            messages.success(request, "Событие добавлено.")
            return redirect("events:index")
    else:
        form = EventForm()

    upcoming_events = list(
        Event.objects.filter(user=request.user, date__gte=today).order_by("date")
    )
    # Annotate each event with its own forecast (not stored on the model —
    # it depends on check-in history, which changes daily) so the template
    # can just read `event.forecast_days`.
    for event in upcoming_events:
        event.forecast_days = forecast_heads_up_days(request.user, event.type)

    return render(request, "events/index.html", {
        "form": form,
        "upcoming_events": upcoming_events,
    })
