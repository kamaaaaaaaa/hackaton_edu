from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, redirect
from django.views.decorators.http import require_POST

from core.views import placeholder_page

from .models import Recommendation


def index(request):
    return placeholder_page(
        request,
        "ИИ-помощник",
        "Здесь появится личный помощник, который объясняет свои рекомендации и отвечает "
        "на вопросы о твоём состоянии — без диагнозов, с опорой на твои собственные отметки.",
    )


@login_required
@require_POST
def give_feedback(request, pk):
    """Mark a Recommendation as helped/not_helped. Scoped to the current user."""
    recommendation = get_object_or_404(Recommendation, pk=pk, user=request.user)
    feedback = request.POST.get("feedback")

    if feedback in dict(Recommendation.FEEDBACK_CHOICES):
        recommendation.feedback = feedback
        recommendation.save(update_fields=["feedback"])

    if request.headers.get("x-requested-with") == "XMLHttpRequest":
        return JsonResponse({"status": "ok", "feedback": recommendation.feedback})
    return redirect("core:home")
