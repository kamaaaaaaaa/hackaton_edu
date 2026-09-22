from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone

from .forms import WeeklySurveyForm
from .models import WeeklySurvey
from .services import interpret_score


@login_required
def survey_form(request):
    """The weekly 6-question CBI personal-burnout form."""
    if request.method == "POST":
        form = WeeklySurveyForm(request.POST)
        if form.is_valid():
            survey = form.save(commit=False)
            survey.user = request.user
            survey.date = timezone.localdate()
            survey.save()
            messages.success(request, "Спасибо! Опросник сохранён.")
            return redirect("surveys:result", pk=survey.pk)
    else:
        form = WeeklySurveyForm()
    return render(request, "surveys/form.html", {"form": form})


@login_required
def survey_result(request, pk):
    """Result page for one submitted survey — only visible to its own user."""
    survey = get_object_or_404(WeeklySurvey, pk=pk, user=request.user)
    return render(request, "surveys/result.html", {
        "survey": survey,
        "interpretation": interpret_score(survey.score),
    })
