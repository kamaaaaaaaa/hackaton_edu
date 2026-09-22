from django.urls import path

from . import views

app_name = "core"

urlpatterns = [
    path("", views.home, name="home"),
    path("progress/", views.progress, name="progress"),
    path("dokazatelnost/", views.validation, name="validation"),
]
