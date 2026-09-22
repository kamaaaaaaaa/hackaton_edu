from django.urls import path

from . import views

app_name = "surveys"

urlpatterns = [
    path("", views.survey_form, name="form"),
    path("<int:pk>/result/", views.survey_result, name="result"),
]
