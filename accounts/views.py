from django.conf import settings
from django.contrib import messages
from django.contrib.auth import login
from django.contrib.auth.decorators import login_required
from django.contrib.auth.views import LoginView
from django.shortcuts import redirect, render
from django.urls import reverse_lazy
from django.views.generic.edit import CreateView

from assistant.models import Recommendation
from checkins.models import CheckIn
from events.models import Event
from surveys.models import WeeklySurvey

from .forms import SignupForm, StyledAuthenticationForm


class SignupView(CreateView):
    form_class = SignupForm
    template_name = "registration/signup.html"
    success_url = reverse_lazy(settings.LOGIN_REDIRECT_URL)

    def form_valid(self, form):
        response = super().form_valid(form)
        login(self.request, self.object)
        return response


class CustomLoginView(LoginView):
    form_class = StyledAuthenticationForm


@login_required
def my_data(request):
    """Summary of everything stored for the current user, plus a way to delete it."""
    user = request.user
    checkins = CheckIn.objects.filter(user=user)
    earliest_checkin = checkins.order_by("date").first()
    profile = getattr(user, "profile", None)

    return render(request, "accounts/my_data.html", {
        "checkin_count": checkins.count(),
        "earliest_checkin_date": earliest_checkin.date if earliest_checkin else None,
        "event_count": Event.objects.filter(user=user).count(),
        "survey_count": WeeklySurvey.objects.filter(user=user).count(),
        "recommendation_count": Recommendation.objects.filter(user=user).count(),
        "group": profile.group if profile else None,
    })


@login_required
def my_data_delete(request):
    """Delete the user's tracked personal data (not the account itself).

    GET shows a confirmation page (no side effects); POST performs the actual
    deletion, so an accidental single click/visit can never delete anything.
    """
    if request.method == "POST":
        user = request.user
        CheckIn.objects.filter(user=user).delete()
        Event.objects.filter(user=user).delete()
        WeeklySurvey.objects.filter(user=user).delete()
        Recommendation.objects.filter(user=user).delete()

        profile = getattr(user, "profile", None)
        if profile is not None:
            profile.nickname = ""
            profile.group = None
            profile.parental_consent = False
            profile.save()

        messages.success(
            request,
            "Все твои данные удалены. Аккаунт и вход в него остались — можно продолжать пользоваться сервисом с чистого листа.",
        )
        return redirect("my_data")

    return render(request, "accounts/my_data_delete_confirm.html")
