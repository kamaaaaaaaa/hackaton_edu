from core.views import placeholder_page


def index(request):
    return placeholder_page(
        request,
        "ИИ-помощник",
        "Здесь появится личный помощник, который объясняет свои рекомендации и отвечает "
        "на вопросы о твоём состоянии — без диагнозов, с опорой на твои собственные отметки.",
    )
