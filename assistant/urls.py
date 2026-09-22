from django.urls import path

from . import views

app_name = "assistant"

urlpatterns = [
    path("", views.index, name="index"),
    path("recommendations/<int:pk>/feedback/", views.give_feedback, name="feedback"),
]
