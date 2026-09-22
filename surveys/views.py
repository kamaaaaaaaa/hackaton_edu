from core.views import placeholder_page


def index(request):
    return placeholder_page(
        request,
        "Еженедельный опросник",
        "Раз в неделю — короткий опросник выгорания (Copenhagen Burnout Inventory). "
        "Занимает около двух минут и помогает точнее видеть твою динамику.",
    )
