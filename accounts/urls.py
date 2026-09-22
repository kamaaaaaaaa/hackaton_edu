from django.urls import path

from . import views
from .views import CustomLoginView, SignupView

urlpatterns = [
    path("signup/", SignupView.as_view(), name="signup"),
    path("login/", CustomLoginView.as_view(), name="login"),
    path("my-data/", views.my_data, name="my_data"),
]
