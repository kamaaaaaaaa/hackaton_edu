from django.urls import path

from . import views

app_name = 'checklist'

urlpatterns = [
    path('', views.checklist_view, name='checklist'),
]
