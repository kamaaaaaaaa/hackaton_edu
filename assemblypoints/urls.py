from django.urls import path

from . import views

app_name = 'assemblypoints'

urlpatterns = [
    path('', views.list_points, name='list'),
]
