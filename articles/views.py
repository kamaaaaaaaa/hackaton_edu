from django.db.models import Q
from django.views.generic import DetailView, ListView

from .models import Article


class ArticleListView(ListView):
    model = Article
    template_name = "articles/list.html"
    context_object_name = "articles"

    def get_queryset(self):
        qs = Article.objects.all().order_by("title")

        category = self.request.GET.get("category") or ""
        audience = self.request.GET.get("audience") or ""
        query = self.request.GET.get("q") or ""

        if category:
            qs = qs.filter(category=category)
        if audience:
            qs = qs.filter(audience=audience)
        if query:
            qs = qs.filter(Q(title__icontains=query) | Q(body__icontains=query))

        return qs

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["categories"] = Article.CATEGORY_CHOICES
        context["audiences"] = Article.AUDIENCE_CHOICES
        context["selected_category"] = self.request.GET.get("category", "")
        context["selected_audience"] = self.request.GET.get("audience", "")
        context["query"] = self.request.GET.get("q", "")
        return context


class ArticleDetailView(DetailView):
    model = Article
    template_name = "articles/detail.html"
    context_object_name = "article"
