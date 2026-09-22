from django.conf import settings
from django.contrib.auth import login
from django.contrib.auth.views import LoginView
from django.urls import reverse_lazy
from django.views.generic.edit import CreateView

from core.views import placeholder_page

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


def my_data(request):
    return placeholder_page(
        request,
        "Мои данные",
        "Скоро здесь можно будет посмотреть, скачать или удалить все свои данные — "
        "отметки самочувствия, ответы опросников и историю рекомендаций. Ты полностью "
        "управляешь тем, что хранится.",
    )
