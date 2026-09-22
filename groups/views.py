from core.views import placeholder_page


def index(request):
    return placeholder_page(
        request,
        "Группы",
        "Присоединяйся к своей учебной группе или классу по коду приглашения, чтобы "
        "куратор видел общую картину благополучия — анонимно, без сравнения участников.",
    )
