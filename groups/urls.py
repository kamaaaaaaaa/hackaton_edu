from django.urls import path

from . import views

app_name = "groups"

urlpatterns = [
    path("", views.join, name="join"),
    path("dashboard/", views.dashboard, name="dashboard"),
]
