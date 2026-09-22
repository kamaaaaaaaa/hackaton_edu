from django.urls import path

from . import views

app_name = "checkins"

urlpatterns = [
    path("submit/", views.submit_checkin, name="submit"),
]
