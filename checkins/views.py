from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.shortcuts import redirect
from django.utils import timezone

from safety.services import contains_crisis_keywords

from .forms import CheckInForm
from .models import CheckIn


@login_required
def submit_checkin(request):
    """Save (or update) today's check-in and bounce back to the dashboard.

    One CheckIn per user per day (see model's unique_together), so a second
    submission on the same day updates today's entry instead of failing.
    """
    if request.method != "POST":
        return redirect("core:home")

    today = timezone.localdate()
    instance = CheckIn.objects.filter(user=request.user, date=today).first()
    form = CheckInForm(request.POST, instance=instance)
    if form.is_valid():
        checkin = form.save(commit=False)
        checkin.user = request.user
        checkin.date = today
        checkin.save()
        if contains_crisis_keywords(checkin.note):
            return redirect("safety:crisis")
        messages.success(request, "Отметка сохранена. Спасибо, что заглянул(а) к себе.")
    else:
        messages.error(request, "Не получилось сохранить отметку — попробуй ещё раз.")
    return redirect("core:home")
