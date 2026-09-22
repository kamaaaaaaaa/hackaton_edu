from django.urls import path

from . import views

app_name = "safety"

urlpatterns = [
    path("crisis/", views.crisis, name="crisis"),
    path("quick-help/", views.quick_help, name="quick_help"),
]
