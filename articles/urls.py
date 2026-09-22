from django.urls import path

from .views import ArticleDetailView, ArticleListView

app_name = "articles"

urlpatterns = [
    path("", ArticleListView.as_view(), name="list"),
    path("<int:pk>/", ArticleDetailView.as_view(), name="detail"),
]
