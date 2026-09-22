from core.views import placeholder_page


def index(request):
    return placeholder_page(
        request,
        "События",
        "Отмечай заранее экзамены, дедлайны и важные проекты — сервис учтёт их в "
        "своих подсказках и не удивится всплеску стресса перед сессией.",
    )
