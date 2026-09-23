from django.urls import path

from . import views

app_name = 'analytics'

urlpatterns = [
    path('track/', views.track, name='track'),
    path('summary/', views.summary, name='summary'),
]
