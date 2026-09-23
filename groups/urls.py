from django.urls import path

from . import views

app_name = 'groups'

urlpatterns = [
    path('create/', views.create_group, name='create'),
    path('join/', views.join_group, name='join'),
    path('<str:code>/members/', views.members_list, name='members'),
    path('<str:code>/members/<int:member_id>/', views.update_member, name='update-member'),
]
